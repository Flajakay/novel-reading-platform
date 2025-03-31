const Novel = require('../../models/novel.model');
const Library = require('../../models/library.model');
const User = require('../../models/user.model');
const { NotFoundError, ValidationError } = require('../../utils/errors');
const logger = require('../../utils/logger');
const { LIBRARY_STATUS } = require('../../utils/constants');

// Import recommendation type services
const similarNovelsService = require('./similar-novels.service');
const genrePopularityService = require('./genre-popularity.service');
const authorRecommendationService = require('./author-recommendation.service');
// These will be implemented later
// const similarUsersService = require('./similar-users.service');
// const continueReadingService = require('./continue-reading.service');

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const recommendationCache = new Map(); // userId -> { timestamp, recommendations }

const RecommendationService = {
    // Get all recommendations for a user
     
    async getUserRecommendations(userId, options = {}) {
        const { limit = 5, refresh = false } = options;
        
        // Check if we have a valid cached result
        const cachedResult = recommendationCache.get(userId);
        if (!refresh && cachedResult && (Date.now() - cachedResult.timestamp < CACHE_TTL)) {
            logger.debug(`Using cached recommendations for user ${userId}`);
            return cachedResult.recommendations;
        }
        
        // Get user and their library
        const user = await User.findById(userId);
        if (!user) {
            throw new NotFoundError('User not found');
        }
        
        // Get all recommendations in parallel
        const [
            similarNovels,
            genrePopularRecommendations,
            authorRecommendations,
            // The following will be implemented later
            similarUserRecommendations = { data: [] },
            continueReadingRecommendations = { data: [] }
        ] = await Promise.all([
            this.getSimilarNovelsRecommendations(userId, { limit }),
            this.getGenrePopularityRecommendations(userId, { limit }),
            this.getAuthorRecommendations(userId, { limit }),
            // These will be implemented later
            // this.getSimilarUsersRecommendations(userId, { limit }),
            // this.getContinueReadingRecommendations(userId, { limit })
        ]);
        
        const recommendations = {
            becauseYouRead: similarNovels,
            readersLikeYou: similarUserRecommendations,
            popularInGenre: genrePopularRecommendations,
            fromAuthorsYouFollow: authorRecommendations,
            continueReading: continueReadingRecommendations
        };
        
        // Cache the results
        recommendationCache.set(userId, {
            timestamp: Date.now(),
            recommendations
        });
        
        return recommendations;
    },
    
    // Invalidate cached recommendations for a user
     
    invalidateUserRecommendations(userId) {
        recommendationCache.delete(userId);
        logger.debug(`Invalidated recommendations cache for user ${userId}`);
    },
    
    // Get recommendations for similar novels based on user's library
     
    async getSimilarNovelsRecommendations(userId, options = {}) {
        return similarNovelsService.getRecommendations(userId, options);
    },
    
    // Get recommendations based on similar users' libraries
     
    async getSimilarUsersRecommendations(userId, options = {}) {
        // Will be implemented later
        return { data: [] };
    },
    
    // Get recommendations based on popular novels in user's favorite genres
     
    async getGenrePopularityRecommendations(userId, options = {}) {
        return genrePopularityService.getRecommendations(userId, options);
    },
    
    // Get recommendations based on authors the user has read
     
    async getAuthorRecommendations(userId, options = {}) {
        return authorRecommendationService.getRecommendations(userId, options);
    },
    
    //Get recommendations for novels the user has started but not finished
     
    async getContinueReadingRecommendations(userId, options = {}) {
        // Will be implemented later
        return { data: [] };
    }
};

module.exports = RecommendationService;