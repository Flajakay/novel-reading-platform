const mongoose = require('mongoose');
const Novel = require('../../models/novel.model');
const Library = require('../../models/library.model');
const User = require('../../models/user.model');
const logger = require('../../utils/logger');

const AuthorRecommendationService = {
    // Get recommendations for novels by authors the user has read
     
    async getRecommendations(userId, options = {}) {
        const { limit = 5 } = options;
        
        // Get user's library
        const libraryItems = await Library.find({
            user: userId
        })
        .populate({
            path: 'novel',
            select: 'author'
        })
        .lean();
        
        if (!libraryItems.length) {
            logger.debug(`User ${userId} has no novels in library for author recommendations`);
            return { data: [] };
        }
        
        // Extract authors from user's read novels
        // Important: We exclude the user themselves as an author to avoid recommending their own books
        const authorIds = libraryItems
            .filter(item => item.novel && item.novel.author && item.novel.author.toString() !== userId)
            .map(item => item.novel.author.toString());
        
        // No duplicates
        const uniqueAuthorIds = [...new Set(authorIds)];
        
        if (!uniqueAuthorIds.length) {
            logger.debug(`No authors found in user ${userId}'s library`);
            return { data: [] };
        }
        
        logger.debug(`Found ${uniqueAuthorIds.length} authors in user ${userId}'s library`);
        
        // Get user's already read novels to exclude them
        const userNovelIds = libraryItems
            .filter(item => item.novel)
            .map(item => item.novel._id.toString());
        
        // Get novels by these authors that the user hasn't read yet
        const recommendations = [];
        
        // Get recommendations for each author
        for (const authorId of uniqueAuthorIds) {
            // For each author, get up to (limit / uniqueAuthorIds.length + 1) novels
            // This ensures we don't overrepresent a single author
            const authorLimit = Math.max(1, Math.ceil(limit / uniqueAuthorIds.length));
            
            const authorNovels = await Novel.find({
                _id: { $nin: userNovelIds.concat(recommendations.map(r => r.novel._id.toString())) },
                author: authorId
            })
            .sort({ 
                createdAt: -1,  // Newest first
                'calculatedStats.averageRating': -1 // Then by rating
            })
            .limit(authorLimit)
            .populate('author', 'username')
            .lean();
            
            // If this author has novels the user hasn't read, add them to recommendations
            if (authorNovels.length > 0) {
                authorNovels.forEach(novel => {
                    if (recommendations.length < limit) {
                        recommendations.push({
                            novel,
                            author: novel.author,
                            reason: `More from ${novel.author.username}`
                        });
                    }
                });
            }
            
            // If we've reached the limit, stop adding more
            if (recommendations.length >= limit) {
                break;
            }
        }
        
        // If we didn't find enough recommendations, we could add more novels from the most popular authors
        if (recommendations.length < limit) {
            logger.debug(`Only found ${recommendations.length} author recommendations, trying popular authors`);
            
            // Get most popular authors based on novel count and view count
            const popularAuthors = await User.aggregate([
                {
                    $lookup: {
                        from: 'novels',
                        localField: '_id',
                        foreignField: 'author',
                        as: 'novels'
                    }
                },
                {
                    $match: {
                        'novels.0': { $exists: true },  // Has at least one novel
                        '_id': { 
                            $nin: [
                                ...uniqueAuthorIds.map(id => new mongoose.Types.ObjectId(id)), // Not already in recommendations
                                new mongoose.Types.ObjectId(userId) // Exclude the user themselves to avoid self-recommendations
                            ] 
                        }
                    }
                },
                {
                    $project: {
                        username: 1,
                        novelCount: { $size: '$novels' },
                        totalViews: { $sum: '$novels.viewCount' }
                    }
                },
                {
                    $sort: { novelCount: -1, totalViews: -1 }
                },
                {
                    $limit: 5
                }
            ]);
            
            // For each popular author, find their best novels
            for (const author of popularAuthors) {
                if (recommendations.length >= limit) break;
                
                const popularAuthorNovels = await Novel.find({
                    _id: { $nin: userNovelIds.concat(recommendations.map(r => r.novel._id.toString())) },
                    author: author._id
                })
                .sort({ 'calculatedStats.averageRating': -1, viewCount: -1 })
                .limit(limit - recommendations.length)
                .populate('author', 'username')
                .lean();
                
                popularAuthorNovels.forEach(novel => {
                    recommendations.push({
                        novel,
                        author: novel.author,
                        reason: `Popular author you might like`
                    });
                });
            }
        }
        
        logger.debug(`Generated ${recommendations.length} author recommendations for user ${userId}`);
        
        return { data: recommendations };
    }
};

module.exports = AuthorRecommendationService;