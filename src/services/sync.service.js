const mongoose = require('mongoose');
const Novel = require('../models/novel.model');
const elasticsearchService = require('./elasticsearch.service');
const logger = require('../utils/logger');

class SyncService {
	constructor() {
		this.pollInterval = 30000; // 30 seconds between checks to balance responsiveness and system load
		this.pollTimer = null;
		this.lastSyncTime = new Date();
		this.maxRetries = 3; // Limit retries to prevent infinite loops while still handling transient failures
		this.batchSize = 100; // Process in batches to avoid memory issues with large datasets
	}

	async initializeSync() {
		try {
			logger.info('Starting initial sync with Elasticsearch');
			await this.processNovelsInBatches(
				await Novel.find().populate('author', 'username').lean(),
				async (novel) => await elasticsearchService.indexNovel(novel)
			);
			this.setupPolling();
		} catch (error) {
			logger.error('Failed to initialize sync:', error);
			throw error;
		}
	}

	setupPolling() {
		if (this.pollTimer) clearInterval(this.pollTimer);

		this.pollTimer = setInterval(async () => {
			const currentTime = new Date();
			try {
				await this.pollForChanges(currentTime);
				// Store current time only after successful sync to ensure no updates are missed
				this.lastSyncTime = currentTime;
			} catch (error) {
				logger.error('Error during polling sync:', error);
				// No lastSyncTime update on failure to ensure retrying the same time window
			}
		}, this.pollInterval);

		logger.info('Polling-based synchronization initialized');
	}

	async pollForChanges(currentTime) {
		const modifiedNovels = await Novel.find({
				updatedAt: {
					$gt: this.lastSyncTime
				}
			})
			.populate('author', 'username')
			.lean();

		if (modifiedNovels.length > 0) {
			await this.processNovelsInBatches(modifiedNovels,
				async (novel) => await this.retryOperation(
					() => elasticsearchService.updateNovel(novel._id, novel)
				)
			);
		}

		await this.handleDeletedNovels();
	}

	async handleDeletedNovels() {
		// Two separate queries instead of in-memory filtering to handle large datasets efficiently
		const [esNovels, mongoNovels] = await Promise.all([
			elasticsearchService.getAllNovelIds(),
			Novel.find({}, '_id').lean()
		]);

		const mongoIds = new Set(mongoNovels.map(n => n._id.toString()));
		const deletedIds = esNovels.filter(id => !mongoIds.has(id));

		if (deletedIds.length > 0) {
			await this.processNovelsInBatches(deletedIds,
				async (id) => await this.retryOperation(
					() => elasticsearchService.deleteNovel(id)
				)
			);
		}
	}

	async verifySync() {
		try {
			logger.info('Starting sync verification');
			const novels = await Novel.find()
				.populate('author', 'username')
				.lean();

			let repaired = 0;
			await this.processNovelsInBatches(novels, async (novel) => {
				try {
					const esDoc = await elasticsearchService.elasticClient.get({
						index: elasticsearchService.NOVEL_INDEX,
						id: novel._id.toString()
					});

					if (!this.compareDocuments(novel, esDoc._source)) {
						await this.retryOperation(
							() => elasticsearchService.indexNovel(novel)
						);
						repaired++;
					}
				} catch (error) {
					// 404 means document exists in MongoDB but not in Elasticsearch
					if (error.meta?.statusCode === 404) {
						await this.retryOperation(
							() => elasticsearchService.indexNovel(novel)
						);
						repaired++;
					}
				}
			});

			logger.info(`Sync verification completed. Repaired ${repaired} documents`);
		} catch (error) {
			logger.error('Failed to verify sync:', error);
		}
	}

	async processNovelsInBatches(items, operation) {
		for (let i = 0; i < items.length; i += this.batchSize) {
			const batch = items.slice(i, i + this.batchSize);
			await Promise.all(batch.map(operation));
		}
	}

	async retryOperation(operation, retries = this.maxRetries) {
		for (let attempt = 1; attempt <= retries; attempt++) {
			try {
				return await operation();
			} catch (error) {
				if (attempt === retries) throw error;
				// Exponential backoff with a maximum delay to handle transient network issues
				const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
				await new Promise(resolve => setTimeout(resolve, delay));
			}
		}
	}

	compareDocuments(mongoDoc, esDoc) {
		// Only compare fields that affect search relevance or display
		const fields = [
			'title', 'description', 'genres', 'tags', 'status',
			'calculatedStats', 'viewCount', 'totalChapters'
		];

		return fields.every(field => {
			const mongoValue = mongoDoc[field];
			const esValue = esDoc[field];
			// Special handling for objects/arrays since direct comparison would fail
			return typeof mongoValue === 'object' && mongoValue !== null ?
				JSON.stringify(mongoValue) === JSON.stringify(esValue) :
				mongoValue === esValue;
		});
	}

	stopSync() {
		if (this.pollTimer) {
			clearInterval(this.pollTimer);
			this.pollTimer = null;
			logger.info('Sync service stopped');
		}
	}
}

module.exports = new SyncService();