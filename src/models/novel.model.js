const mongoose = require('mongoose');
const {
	NOVEL_STATUS
} = require('../utils/constants');

const ratingSchema = new mongoose.Schema({
	user: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true
	},
	value: {
		type: Number,
		required: true,
		min: 1,
		max: 5
	},
	createdAt: {
		type: Date,
		default: Date.now
	}
}, {
	_id: false
});

const novelSchema = new mongoose.Schema({
	title: {
		type: String,
		required: true,
		trim: true,
		maxlength: 100
	},
	description: {
		type: String,
		required: true,
		trim: true,
		maxlength: 1000
	},
	author: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true,
		index: true
	},
	genres: [{
		type: String,
		maxlength: 20
	}],
	tags: [{
		type: String,
		maxlength: 20
	}],
	status: {
		type: String,
		enum: Object.values(NOVEL_STATUS),
		default: NOVEL_STATUS.ONGOING
	},
	totalChapters: {
		type: Number,
		default: 0
	},
	viewCount: {
		type: Number,
		default: 0
	},
	cover: {
		data: Buffer,
		contentType: String
	},
	ratings: [ratingSchema],
	calculatedStats: {
		averageRating: {
			type: Number,
			default: 0
		},
		ratingCount: {
			type: Number,
			default: 0
		}
	}
}, {
	timestamps: {
		createdAt: 'createdAt',
		updatedAt: false
	},
	toJSON: {
		virtuals: true,
		transform: function(doc, ret) {
			// Don't include the binary data in the JSON response by default
			if (ret.cover && ret.cover.data) {
				ret.hasCover = true;
				delete ret.cover.data;
			} else {
				ret.hasCover = false;
			}
			return ret;
		}
	},
	toObject: {
		virtuals: true
	}
});

novelSchema.virtual('chapters', {
	ref: 'Chapter',
	localField: '_id',
	foreignField: 'novelId'
});

novelSchema.index({
	author: 1,
	status: 1
});
novelSchema.index({
	'ratings.user': 1,
	_id: 1
});

// Pre-save middleware to update calculatedStats
novelSchema.pre('save', function(next) {
	if (this.isModified('ratings')) {
		const ratings = this.ratings || [];
		this.calculatedStats = {
			averageRating: ratings.length > 0 ?
				ratings.reduce((acc, curr) => acc + curr.value, 0) / ratings.length :
				0,
			ratingCount: ratings.length
		};
	}
	next();
});

novelSchema.methods.addRating = async function(userId, rating) {
	const existingRatingIndex = this.ratings.findIndex(r =>
		r.user.toString() === userId.toString()
	);

	if (existingRatingIndex >= 0) {
		this.ratings[existingRatingIndex].value = rating;
		this.ratings[existingRatingIndex].createdAt = new Date();
	} else {
		this.ratings.push({
			user: userId,
			value: rating,
			createdAt: new Date()
		});
	}

	return this.save();
};

novelSchema.methods.getUserRating = function(userId) {
	const rating = this.ratings.find(r => r.user.toString() === userId.toString());
	return rating ? rating.value : null;
};

novelSchema.methods.removeRating = async function(userId) {
	const initialLength = this.ratings.length;
	this.ratings = this.ratings.filter(r => r.user.toString() !== userId.toString());

	if (this.ratings.length !== initialLength) {
		return this.save();
	}
	return this;
};

novelSchema.statics.incrementViewCount = async function(novelId) {
	return this.findByIdAndUpdate(
		novelId, {
			$inc: {
				viewCount: 1
			}
		}, {
			new: true
		}
	).select('viewCount');
};

novelSchema.statics.getRatingStats = async function(novelId) {
	const novel = await this.findById(novelId).select('ratings calculatedStats');
	if (!novel) return null;

	const ratingDistribution = Array(5).fill(0);
	novel.ratings.forEach(rating => {
		ratingDistribution[rating.value - 1]++;
	});

	return {
		averageRating: novel.calculatedStats.averageRating,
		totalRatings: novel.calculatedStats.ratingCount,
		distribution: ratingDistribution,
		distributionPercentages: ratingDistribution.map(count =>
			(count / novel.calculatedStats.ratingCount * 100) || 0
		)
	};
};

novelSchema.statics.getAggregateAuthorStats = async function(authorId) {
    const novelStats = await this.aggregate([
        { $match: { author: new mongoose.Types.ObjectId(authorId) } },
        { $group: {
            _id: null,
            totalNovels: { $sum: 1 },
            totalViews: { $sum: '$viewCount' },
            avgRating: { $avg: '$calculatedStats.averageRating' },
            totalRatings: { $sum: '$calculatedStats.ratingCount' },
            totalChapters: { $sum: '$totalChapters' }
        }}
    ]);
    
    if (!novelStats.length) {
        return {
            totalNovels: 0,
            totalViews: 0,
            avgRating: 0,
            totalRatings: 0,
            totalChapters: 0,
            totalChapterReads: 0,
            totalWords: 0
        };
    }

    const chapterStats = await mongoose.model('Chapter').getAggregateStatsByAuthor(authorId);

    return {
        totalNovels: novelStats[0].totalNovels,
        totalViews: novelStats[0].totalViews || 0,
        avgRating: novelStats[0].avgRating ? parseFloat(novelStats[0].avgRating.toFixed(2)) : 0,
        totalRatings: novelStats[0].totalRatings || 0,
        totalChapters: novelStats[0].totalChapters || 0,
        totalChapterReads: chapterStats ? chapterStats.totalChapterReads : 0,
        totalWords: chapterStats ? chapterStats.totalWords : 0
    };
};

const Novel = mongoose.model('Novel', novelSchema);

module.exports = Novel;