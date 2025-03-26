const mongoose = require('mongoose');
const {
	CONTENT_STATUS
} = require('../utils/constants');

const chapterSchema = new mongoose.Schema({
	novelId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Novel',
		required: true,
		index: true
	},
	chapterNumber: {
		type: Number,
		required: true,
		min: 1
	},
	title: {
		type: String,
		required: true,
		trim: true,
		maxlength: 200
	},
	content: {
		type: String,
		required: true,
		trim: true,
		minlength: 100
	},
	status: {
		type: String,
		enum: Object.values(CONTENT_STATUS),
		default: CONTENT_STATUS.DRAFT,
		index: true
	},
	readCount: {
		type: Number,
		default: 0,
		min: 0,
		index: true
	},
	wordCount: {
		type: Number,
		default: 0
	},
	estimatedReadTime: {
		type: Number,
		default: 0 // in minutes
	}
}, {
	timestamps: {
		createdAt: 'createdAt',
		updatedAt: 'lastUpdatedAt'
	}
});

// Compound index for efficient chapter lookup within a novel
chapterSchema.index({
	novelId: 1,
	chapterNumber: 1
}, {
	unique: true
});

chapterSchema.index({
	novelId: 1,
	status: 1,
	chapterNumber: 1
});

// Calculate word count and estimated read time before saving
chapterSchema.pre('save', function(next) {
	if (this.isModified('content')) {
		this.wordCount = this.content.trim().split(/\s+/).length;
		// Average reading speed: 200 words per minute
		this.estimatedReadTime = Math.ceil(this.wordCount / 200);
	}
	next();
});

chapterSchema.pre('save', async function(next) {
	if (this.isNew) {
		// Update novel's total chapters and lastUpdatedAt when a new chapter is created
		await mongoose.model('Novel').findByIdAndUpdate(
			this.novelId, {
				$inc: {
					totalChapters: 1
				},
				$set: {
					lastUpdatedAt: new Date()
				}
			}
		);
	}
	next();
});

chapterSchema.methods = {
	async incrementReadCount() {
		this.readCount += 1;
		return this.save();
	},

	getNextChapterNumber() {
		return this.model('Chapter')
			.findOne({
				novelId: this.novelId,
				chapterNumber: {
					$gt: this.chapterNumber
				},
				status: CONTENT_STATUS.PUBLISHED
			})
			.select('chapterNumber')
			.sort({
				chapterNumber: 1
			});
	},

	getPreviousChapterNumber() {
		return this.model('Chapter')
			.findOne({
				novelId: this.novelId,
				chapterNumber: {
					$lt: this.chapterNumber
				},
				status: CONTENT_STATUS.PUBLISHED
			})
			.select('chapterNumber')
			.sort({
				chapterNumber: -1
			});
	}
};


chapterSchema.statics = {
	getAggregateStatsByAuthor: async function(authorId) {
		const result = await this.aggregate([
			{ 
				$lookup: {
					from: 'novels',
					localField: 'novelId',
					foreignField: '_id',
					as: 'novel'
				}
			},
			{ $unwind: '$novel' },
			{ $match: { 'novel.author': new mongoose.Types.ObjectId(authorId) } },
			{ $group: {
				_id: null,
				totalChapterReads: { $sum: '$readCount' },
				totalWords: { $sum: '$wordCount' }
			}}
		]);
	
		return result.length ? result[0] : { totalChapterReads: 0, totalWords: 0 };
	},
	

};
const Chapter = mongoose.model('Chapter', chapterSchema);

module.exports = Chapter;