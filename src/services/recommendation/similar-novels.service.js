const Novel = require('../../models/novel.model');
const Library = require('../../models/library.model');
const { LIBRARY_STATUS } = require('../../utils/constants');
const logger = require('../../utils/logger');

/**
 * Calculate similarity score between two novels
 * Higher score means more similar novels
 */
const calculateSimilarity = (novel1, novel2) => {
    let score = 0;
    
    // Same author - strong signal
    if (novel1.author.toString() === novel2.author.toString()) {
        score += 2;
    }
    
    // Genre similarity - medium signal
    const novel1Genres = novel1.genres || [];
    const novel2Genres = novel2.genres || [];
    
    const commonGenres = novel1Genres.filter(genre => 
        novel2Genres.includes(genre)
    );
    
    // Add points for each common genre
    score += (commonGenres.length * 1.5);
    
    // Penalize if no common genres
    if (commonGenres.length === 0) {
        score -= 1;
    }
    
    // Tag similarity - weak signal
    const novel1Tags = novel1.tags || [];
    const novel2Tags = novel2.tags || [];
    
    const commonTags = novel1Tags.filter(tag => 
        novel2Tags.includes(tag)
    );
    
    // Add points for each common tag
    score += (commonTags.length * 0.5);
    
    return score;
};

const SimilarNovelsService = {
    
    //Get novel recommendations based on user's library
     
    async getRecommendations(userId, options = {}) {
        const { limit = 5 } = options;
        
        // Get user's library items, focusing on completed and highly rated novels
        const libraryItems = await Library.find({
            user: userId,
            status: { $in: [LIBRARY_STATUS.COMPLETED, LIBRARY_STATUS.CURRENTLY_READING] }
        })
        .populate({
            path: 'novel',
            select: 'title description author genres tags status totalChapters viewCount calculatedStats',
            populate: {
                path: 'author',
                select: 'username'
            }
        })
        .lean();
        
        if (!libraryItems.length) {
            logger.debug(`User ${userId} has no completed or in-progress novels for recommendations`);
            return { data: [] };
        }
        
        // Get IDs of novels in the user's library to exclude them from recommendations
        const userNovelIds = libraryItems.map(item => item.novel._id.toString());
        
        // Get source novels (the ones the user has read and liked)
        const sourceNovels = libraryItems
            .filter(item => {
                logger.debug(`Checking library item for user ${userId}: status=${item.status}, averageRating=${item.novel.calculatedStats?.averageRating}`);
                
                // For completed novels, don't filter by rating (use all completed novels)
                return item.status === LIBRARY_STATUS.COMPLETED || 
                       item.status === LIBRARY_STATUS.CURRENTLY_READING;
            })
            .map(item => item.novel);
        
        if (!sourceNovels.length) {
            logger.debug(`User ${userId} has no suitable source novels for recommendations`);
            return { data: [] };
        }
        
        // Get potential recommendation novels - use a more lenient query for small databases
        let potentialNovels = [];
        
        // First try to find novels with matching genres
        if (sourceNovels.length > 0 && sourceNovels[0].genres && sourceNovels[0].genres.length > 0) {
            potentialNovels = await Novel.find({
                _id: { $nin: userNovelIds },
                // Match any genre from the user's read novels
                genres: { 
                    $in: [...new Set(sourceNovels.flatMap(novel => novel.genres))]
                }
            })
            .populate('author', 'username')
            .limit(100)
            .lean();
        }
        
        // If no matches, find any novels not in the user's library
        if (potentialNovels.length === 0) {
            logger.debug(`No genre-matched novels found for user ${userId}, trying any novels`);
            potentialNovels = await Novel.find({
                _id: { $nin: userNovelIds }
            })
            .populate('author', 'username')
            .limit(10)
            .lean();
        }
        
        if (!potentialNovels.length) {
            logger.debug(`No potential recommendations found for user ${userId}`);
            return { data: [] };
        }
        
        logger.debug(`Found ${potentialNovels.length} potential recommendation novels for user ${userId}`);
        if (potentialNovels.length > 0) {
            logger.debug(`Sample potential novel: ${potentialNovels[0].title}, genres: ${potentialNovels[0].genres}`);
        }
        
        // Calculate similarity scores for each potential novel against each source novel
        const scoredRecommendations = [];
        
        potentialNovels.forEach(potentialNovel => {
            let bestScore = 0;
            let bestMatchNovel = null;
            
            // Find the source novel with highest similarity
            sourceNovels.forEach(sourceNovel => {
                const score = calculateSimilarity(sourceNovel, potentialNovel);
                
                if (score > bestScore) {
                    bestScore = score;
                    bestMatchNovel = sourceNovel;
                }
            });
            
            // Accept any score for now, even negative ones
            // In a production system with more data, use: if (bestScore > 0 && bestMatchNovel)
            if (bestMatchNovel) {
                scoredRecommendations.push({
                    novel: potentialNovel,
                    score: bestScore,
                    sourceNovel: bestMatchNovel
                });
            }
        });
        
        logger.debug(`Generated ${scoredRecommendations.length} scored recommendations for user ${userId}`);
        
        // Sort by score (descending) and take the top recommendations
        const topRecommendations = scoredRecommendations
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
        
        return {
            data: topRecommendations.map(rec => ({
                novel: rec.novel,
                reason: `Because you read ${rec.sourceNovel.title}`,
                sourceNovel: {
                    id: rec.sourceNovel._id,
                    title: rec.sourceNovel.title
                }
            }))
        };
    }
};

module.exports = SimilarNovelsService;