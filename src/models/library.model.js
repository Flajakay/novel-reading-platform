const mongoose = require('mongoose');
const { LIBRARY_STATUS } = require('../utils/constants');

const librarySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    novel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Novel',
        required: true
    },
    status: {
        type: String,
        enum: Object.values(LIBRARY_STATUS),
        default: LIBRARY_STATUS.WILL_READ,
        index: true
    },
    lastReadChapter: {
        type: Number,
        default: 0
    },
    notes: {
        type: String,
        maxlength: 500
    }
}, {
    timestamps: true
});

// Compound index for efficient lookup and to ensure a novel can only be in a user's library once
librarySchema.index({ user: 1, novel: 1 }, { unique: true });

librarySchema.methods = {
    updateStatus(newStatus) {
        this.status = newStatus;
        return this.save();
    },
    
    updateLastReadChapter(chapterNumber) {
        this.lastReadChapter = chapterNumber;
        return this.save();
    }
};

librarySchema.statics = {
    async getUserLibrary(userId, query = {}) {
        const filter = { user: userId };
        
        if (query.status) {
            filter.status = query.status;
        }
        
        return this.find(filter)
            .populate({
                path: 'novel',
                select: 'title description author genres status totalChapters viewCount calculatedStats',
                populate: {
                    path: 'author',
                    select: 'username'
                }
            })
            .sort({ updatedAt: -1 });
    },
    
    async addToLibrary(userId, novelId, status = LIBRARY_STATUS.WILL_READ) {
        // Upsert to handle both add and update
        return this.findOneAndUpdate(
            { user: userId, novel: novelId },
            { status },
            { upsert: true, new: true }
        );
    },
    
    async removeFromLibrary(userId, novelId) {
        return this.findOneAndDelete({ user: userId, novel: novelId });
    }
};

const Library = mongoose.model('Library', librarySchema);

module.exports = Library;