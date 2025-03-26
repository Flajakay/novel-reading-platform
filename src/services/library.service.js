const Library = require('../models/library.model');
const Novel = require('../models/novel.model');
const { NotFoundError } = require('../utils/errors');
const { NOVEL_ERRORS, LIBRARY_STATUS } = require('../utils/constants');
const logger = require('../utils/logger');

const LibraryService = {
    async getUserLibrary(userId, query = {}) {
        const page = parseInt(query.page) || 1;
        const limit = parseInt(query.limit) || 20;
        const skip = (page - 1) * limit;
        
        const filter = { user: userId };
        
        if (query.status) {
            filter.status = query.status;
        }
        
        const [items, totalCount] = await Promise.all([
            Library.find(filter)
                .populate({
                    path: 'novel',
                    select: 'title description author genres status totalChapters viewCount calculatedStats cover',
                    populate: {
                        path: 'author',
                        select: 'username'
                    }
                })
                .sort({ updatedAt: -1 })
                .skip(skip)
                .limit(limit),
            Library.countDocuments(filter)
        ]);
        
        return {
            data: items,
            pagination: {
                page,
                limit,
                total: totalCount,
                pages: Math.ceil(totalCount / limit)
            }
        };
    },
    
    async addToLibrary(userId, novelId, status, notes) {
        const novel = await Novel.findById(novelId);
        if (!novel) {
            throw new NotFoundError(NOVEL_ERRORS.NOVEL_NOT_FOUND);
        }
        
        const libraryItem = await Library.findOneAndUpdate(
            { user: userId, novel: novelId },
            { 
                status: status || LIBRARY_STATUS.WILL_READ,
                notes: notes || '',
                user: userId,
                novel: novelId
            },
            { upsert: true, new: true, runValidators: true }
        );
        
        return libraryItem;
    },
    
    async removeFromLibrary(userId, novelId) {
        const result = await Library.findOneAndDelete({ user: userId, novel: novelId });
        if (!result) {
            throw new NotFoundError('Novel not found in library');
        }
        return { success: true };
    },
    
    async updateLibraryItemStatus(userId, novelId, newStatus) {
        const libraryItem = await Library.findOne({ user: userId, novel: novelId });
        if (!libraryItem) {
            throw new NotFoundError('Novel not found in library');
        }
        
        libraryItem.status = newStatus;
        await libraryItem.save();
        
        return libraryItem;
    },
    
    async updateLastReadChapter(userId, novelId, chapterNumber) {
        let libraryItem = await Library.findOne({ user: userId, novel: novelId });
        
        if (!libraryItem) {
            libraryItem = await this.addToLibrary(
                userId, 
                novelId, 
                LIBRARY_STATUS.CURRENTLY_READING
            );
        } else if (libraryItem.status !== LIBRARY_STATUS.CURRENTLY_READING) {
            libraryItem.status = LIBRARY_STATUS.CURRENTLY_READING;
        }
        
        libraryItem.lastReadChapter = chapterNumber;
        await libraryItem.save();
        
        return libraryItem;
    },

    async checkNovelInLibrary(userId, novelId) {
        const libraryItem = await Library.findOne({ user: userId, novel: novelId });
        if (!libraryItem) {
            return null;
        }
        return {
            status: libraryItem.status,
            lastReadChapter: libraryItem.lastReadChapter,
            notes: libraryItem.notes
        };
    }
};

module.exports = LibraryService;