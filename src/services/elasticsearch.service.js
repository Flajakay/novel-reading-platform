const {
	elasticClient,
	NOVEL_INDEX
} = require('../config/elasticsearch');
const logger = require('../utils/logger');

class ElasticsearchService {
	async indexNovel(novel) {
		try {
			await elasticClient.index({
				index: NOVEL_INDEX,
				id: novel._id.toString(),
				document: this.transformNovelToDocument(novel)
			});
			logger.debug(`Indexed novel ${novel._id}`);
		} catch (error) {
			logger.error(`Failed to index novel ${novel._id}:`, error);
			throw error;
		}
	}

	async bulkIndex(novels) {
		try {
			// Flatten array for bulk operation format required by Elasticsearch
			// Each item needs an action object followed by a document object
			const operations = novels.flatMap(novel => [{
					index: {
						_index: NOVEL_INDEX,
						_id: novel._id.toString()
					}
				},
				this.transformNovelToDocument(novel)
			]);

			const {
				errors,
				items
			} = await elasticClient.bulk({
				operations
			});

			// Check for partial failures in bulk operation
			if (errors) {
				const failedItems = items.filter(item => item.index.error);
				logger.error(`Bulk indexing had errors:`, failedItems);
				throw new Error('Bulk indexing failed');
			}

			logger.debug(`Bulk indexed ${novels.length} novels`);
		} catch (error) {
			logger.error('Bulk indexing failed:', error);
			throw error;
		}
	}

	async updateNovel(novelId, updateData) {
		try {
			await elasticClient.update({
				index: NOVEL_INDEX,
				id: novelId.toString(),
				doc: this.transformNovelToDocument(updateData)
			});
			logger.debug(`Updated novel ${novelId}`);
		} catch (error) {
			logger.error(`Failed to update novel ${novelId}:`, error);
			throw error;
		}
	}

	async bulkUpdate(updates) {
		try {
			// Similar to bulkIndex but with update operation
			const operations = updates.flatMap(({
				id,
				data
			}) => [{
					update: {
						_index: NOVEL_INDEX,
						_id: id.toString()
					}
				},
				{
					doc: this.transformNovelToDocument(data)
				}
			]);

			const {
				errors,
				items
			} = await elasticClient.bulk({
				operations
			});

			if (errors) {
				const failedItems = items.filter(item => item.update.error);
				logger.error(`Bulk update had errors:`, failedItems);
				throw new Error('Bulk update failed');
			}

			logger.debug(`Bulk updated ${updates.length} novels`);
		} catch (error) {
			logger.error('Bulk update failed:', error);
			throw error;
		}
	}

	async deleteNovel(novelId) {
		try {
			await elasticClient.delete({
				index: NOVEL_INDEX,
				id: novelId.toString()
			});
			logger.debug(`Deleted novel ${novelId}`);
		} catch (error) {
			logger.error(`Failed to delete novel ${novelId}:`, error);
			throw error;
		}
	}

	async bulkDelete(novelIds) {
		try {
			const operations = novelIds.map(id => ({
				delete: {
					_index: NOVEL_INDEX,
					_id: id.toString()
				}
			}));

			const {
				errors,
				items
			} = await elasticClient.bulk({
				operations
			});

			if (errors) {
				const failedItems = items.filter(item => item.delete.error);
				logger.error(`Bulk deletion had errors:`, failedItems);
				throw new Error('Bulk deletion failed');
			}

			logger.debug(`Bulk deleted ${novelIds.length} novels`);
		} catch (error) {
			logger.error('Bulk deletion failed:', error);
			throw error;
		}
	}

	async searchNovels(searchParams) {
		
		const {
			search,         
			genres,          
			tags,           
			status,         
			minRating,      
			sortBy,        
			page = 1,       
			limit = 10,    
			author          
		} = searchParams;

		try {
			const searchBody = {
				query: {
					bool: { 
						must: [],     
						should: [],   
						filter: [],
						minimum_should_match: 0
					}
				}
			};

			// Only require a should match if search or author is provided
			// This allows for pure filtering when no search term is given
			if (search || author) {
				searchBody.query.bool.minimum_should_match = 1;
			}

			if (search) {
				searchBody.query.bool.should.push({
					multi_match: { 
						query: search,
						fields: ['title^3', 'description'], // Boost title matches for relevance
						type: 'best_fields',    
						fuzziness: 'AUTO',     // Enable fuzzy matching for typo tolerance
						boost: 2.0       // Give search matches higher priority than author matches
					}
				});
			}

			if (author) {
				// Provide multiple matching strategies for author with different boost values
				// to balance precision and recall in author search
				searchBody.query.bool.should.push(
					{
						term: { 
							'author.username': {
								value: author,
								boost: 5.0  // Exact match gets highest priority
							}
						}
					},
					{
						match_phrase_prefix: {
							'author.username': {
								query: author,
								boost: 3.0  // Prefix match gets medium priority
							}
						}
					},
					{
						match: {
							'author.username': {
								query: author,
								fuzziness: 'AUTO', // Fuzzy match for typo tolerance
								boost: 1.0  // Fuzzy match gets lowest priority
							}
						}
					}
				);
			}

			if (genres?.length) {
				// Use nested bool to require ALL genres to match (AND logic)
				const genreFilters = genres.map(genre => ({
					term: { genres: genre }
				}));
				searchBody.query.bool.filter.push({
					bool: {
						must: genreFilters
					}
				});
			}

			if (tags?.length) {
				// Use nested bool to require ALL tags to match (AND logic)
				const tagFilters = tags.map(tag => ({
					term: { tags: tag }
				}));
				searchBody.query.bool.filter.push({
					bool: {
						must: tagFilters
					}
				});
			}

			if (status) {
				searchBody.query.bool.filter.push({
					term: { status }
				});
			}

			if (minRating) {
				searchBody.query.bool.filter.push({
					range: {  
						'calculatedStats.averageRating': { gte: Number(minRating) }
					}
				});
			}

			searchBody.sort = this.buildSortOptions(sortBy);
			searchBody.from = (page - 1) * limit; // Convert page to zero-based offset
			searchBody.size = limit;

			// Only add highlighting when there's something to highlight
			if (search || author) {
				searchBody.highlight = {
					fields: {
						title: {},
						description: {},
						'author.username': {}
					}
				};
			}

			const searchStartTime = Date.now();
			const result = await elasticClient.search({
				index: NOVEL_INDEX,
				body: searchBody
			});
			
			const searchEndTime = Date.now();

			const response = {
				total: result.hits.total.value,
				hits: result.hits.hits.map(hit => ({
					...hit._source,
					id: hit._id,
					score: hit._score,
					highlights: hit.highlight
				}))
			};

			return response;
		} catch (error) {
			logger.error('Search failed:', error);
			throw error;
		}
	}

	buildSortOptions(sortBy) {
		switch (sortBy) {
			case 'rating':
				return [{ 'calculatedStats.averageRating': 'desc' }];
			case 'views':
				return [{ viewCount: 'desc' }];
			case 'recent':
				return [{ updatedAt: 'desc' }];
			case 'chapters':
				return [{ totalChapters: 'desc' }];
			default:
				return [{ _score: 'desc' }]; // Default to relevance sorting
		}
	}

	transformNovelToDocument(novel) {
		const esDocument = {
			title: novel.title,
			description: novel.description,

			author: novel.author && {
				id: novel.author._id?.toString(),  
				username: novel.author.username
			},

			genres: novel.genres || [],
			tags: novel.tags || [],

			status: novel.status,

			calculatedStats: {
				averageRating: novel.calculatedStats?.averageRating || 0,
				ratingCount: novel.calculatedStats?.ratingCount || 0
			},

			hasCover: novel.cover && novel.cover.data ? true : false,

			viewCount: novel.viewCount || 0,
			totalChapters: novel.totalChapters || 0,

			createdAt: novel.createdAt,
			updatedAt: novel.updatedAt
		};

		// Remove binary data before indexing to reduce document size
		// and avoid base64 encoding overhead
		if (esDocument.cover && esDocument.cover.data) {
			delete esDocument.cover;
		}

		// Clean up any undefined fields to prevent Elasticsearch errors
		Object.keys(esDocument).forEach(key => {
			if (esDocument[key] === undefined) {
				delete esDocument[key];
			}
		});

		return esDocument;
	}

	async getAllNovelIds() {
		try {
			const result = await elasticClient.search({
				index: NOVEL_INDEX,
				body: {
					query: {
						match_all: {}
					},
					_source: false, // Only return IDs, not document content
					size: 10000     // Assumes collection size is manageable; for larger collections would need pagination
				}
			});

			return result.hits.hits.map(hit => hit._id);
		} catch (error) {
			logger.error('Failed to get novel IDs:', error);
			throw error;
		}
	}
	
	async getRecentNovels(limit = 5) {
		try {
			const result = await elasticClient.search({
				index: NOVEL_INDEX,
				body: {
					query: { match_all: {} },
					sort: [{ createdAt: 'desc' }],
					size: limit
				}
			});

			return result.hits.hits.map(hit => ({
				id: hit._id,
				title: hit._source.title,
				author: hit._source.author.username,
				createdAt: hit._source.createdAt
			}));
		} catch (error) {
			logger.error('Failed to fetch recent novels:', error);
			throw error;
		}
	}
}

module.exports = new ElasticsearchService();