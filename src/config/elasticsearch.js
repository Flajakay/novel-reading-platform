const {
	Client
} = require('@elastic/elasticsearch');
const logger = require('../utils/logger');

const elasticClient = new Client({
	// Default to localhost if not specified in environment variables
	// This makes development and testing easier without requiring a full configuration
	node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
	auth: {
		username: process.env.ELASTICSEARCH_USERNAME,
		password: process.env.ELASTICSEARCH_PASSWORD
	},
	// Multiple retries help handle transient network issues
	maxRetries: 5,
	// Request timeout is longer than HTTP timeouts to allow for complex queries
	// but not so long that failed requests block indefinitely
	requestTimeout: 10000,
	// Sniffing on start discovers cluster nodes automatically
	// This helps with load balancing and failover
	sniffOnStart: true
});

const NOVEL_INDEX = 'novels';

// Comprehensive mapping definition ensures consistent indexing and query behavior
// Proper analysis and field definitions are crucial for search quality
const NOVEL_MAPPING = {
    mappings: {
        properties: {
            title: { 
                // Text type with keyword sub-field allows for both full-text search
                // and exact matching/aggregations on the same field
                type: 'text',
                analyzer: 'standard',
                fields: {
                    keyword: { type: 'keyword' }
                }
            },

            description: { 
                type: 'text',
                analyzer: 'standard'
            },

            author: {
                properties: {
                    id: { type: 'keyword' },
                    username: { 
                        type: 'text',
                        analyzer: 'standard',
                        fields: {
                            keyword: { type: 'keyword' }
                        }
                    }
                }
            },

            genres: { type: 'keyword' },
            
            tags: { type: 'keyword' },
            
            status: { type: 'keyword' },

            calculatedStats: {
                properties: {
                    averageRating: { type: 'float' },
                    ratingCount: { type: 'integer' }
                }
            },

            hasCover: { type: 'boolean' },

            viewCount: { type: 'integer' },
            
            totalChapters: { type: 'integer' },

            createdAt: { type: 'date' },
            updatedAt: { type: 'date' }
        }
    },

    settings: {
        analysis: {
            analyzer: {
                // Standard analyzer with English stopwords improves relevance
                // by removing common words like "the", "and", etc.
                standard: {
                    type: 'standard',
                    stopwords: '_english_'
                }
            }
        }
    }
};


async function initializeElasticsearch() {
	try {
		// Check if index exists before creating it
		// This prevents errors on application restart
		const indexExists = await elasticClient.indices.exists({
			index: NOVEL_INDEX
		});

		if (!indexExists) {
			await elasticClient.indices.create({
				index: NOVEL_INDEX,
				body: NOVEL_MAPPING
			});
			logger.info(`Created Elasticsearch index: ${NOVEL_INDEX}`);
		}

		logger.info('Elasticsearch initialized successfully');
	} catch (error) {
		// Log and rethrow to allow calling code to handle initialization failure
		// This is critical since search functionality won't work without Elasticsearch
		logger.error('Failed to initialize Elasticsearch:', error);
		throw error;
	}
}

module.exports = {
	elasticClient,
	NOVEL_INDEX,
	initializeElasticsearch
};