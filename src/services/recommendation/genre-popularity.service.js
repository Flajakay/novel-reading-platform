const Novel = require('../../models/novel.model');
const Library = require('../../models/library.model');
const { LIBRARY_STATUS } = require('../../utils/constants');
const logger = require('../../utils/logger');

const GenrePopularityService = {
    //Get popular novels in the user's favorite genres
    async getRecommendations(userId, options = {}) {
        const { limit = 5 } = options;
        
        // Get user's library to determine favorite genres
        const libraryItems = await Library.find({
            user: userId
        })
        .populate({
            path: 'novel',
            select: 'genres'
        })
        .lean();
        
        if (!libraryItems.length) {
            logger.debug(`User ${userId} has no novels in library for genre recommendations`);
            return { data: [] };
        }
        
        // Extract all genres from user's library
        const allGenres = libraryItems
            .filter(item => item.novel && item.novel.genres)
            .flatMap(item => item.novel.genres);
        
        // Count genre frequency to find favorites
        const genreCounts = {};
        allGenres.forEach(genre => {
            genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        });
        
        // Sort genres by frequency (most common first)
        const favoriteGenres = Object.entries(genreCounts)
            .sort((a, b) => b[1] - a[1])
            .map(entry => entry[0]);
        
        if (!favoriteGenres.length) {
            logger.debug(`No genres found in user ${userId}'s library`);
            return { data: [] };
        }
        
        logger.debug(`Found favorite genres for user ${userId}: ${favoriteGenres.join(', ')}`);
        
        // Get user's existing novels (to exclude from recommendations)
        const userNovelIds = libraryItems
            .filter(item => item.novel)
            .map(item => item.novel._id.toString());
        
        // Get top novels from user's favorite genres, prioritizing most favorite genre
        const recommendations = [];
        const maxGenresToTry = Math.min(favoriteGenres.length, 3); // Try up to 3 genres
        
        for (let i = 0; i < maxGenresToTry && recommendations.length < limit; i++) {
            const genre = favoriteGenres[i];
            
            // Skip if no genre found
            if (!genre) continue;
            
            // Find popular novels in this genre that user hasn't read
            const genreNovels = await Novel.find({
                _id: { $nin: userNovelIds.concat(recommendations.map(r => r.novel._id.toString())) },
                genres: genre,
            })
            .sort({ 
                'calculatedStats.averageRating': -1, 
                viewCount: -1
            })
            .limit(limit - recommendations.length)
            .populate('author', 'username')
            .lean();
            
            // Add novels to recommendations with genre info
            genreNovels.forEach(novel => {
                recommendations.push({
                    novel,
                    genre,
                    reason: `Popular in ${genre}`
                });
            });
        }
        
        // If we still need more recommendations, get generally popular novels
        if (recommendations.length < limit) {
            const remainingLimit = limit - recommendations.length;
            const existingIds = userNovelIds.concat(recommendations.map(r => r.novel._id.toString()));
            
            const popularNovels = await Novel.find({
                _id: { $nin: existingIds }
            })
            .sort({ 
                'calculatedStats.averageRating': -1, 
                viewCount: -1
            })
            .limit(remainingLimit)
            .populate('author', 'username')
            .lean();
            
            // Add as general recommendations
            popularNovels.forEach(novel => {
                const primaryGenre = novel.genres && novel.genres.length > 0 
                    ? novel.genres[0] 
                    : 'popular novels';
                
                recommendations.push({
                    novel,
                    genre: primaryGenre,
                    reason: `Popular in ${primaryGenre}`
                });
            });
        }
        
        logger.debug(`Generated ${recommendations.length} genre popularity recommendations for user ${userId}`);
        
        return { data: recommendations };
    }
};

module.exports = GenrePopularityService;