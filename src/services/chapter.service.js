const Chapter = require('../models/chapter.model');
const Novel = require('../models/novel.model');
const {
	NotFoundError,
	ValidationError
} = require('../utils/errors');
const {
	NOVEL_ERRORS
} = require('../utils/constants');

const ChapterService = {
	async createChapter(novelId, chapterData) {
		const novel = await Novel.findById(novelId);
		if (!novel) {
			throw new NotFoundError(NOVEL_ERRORS.NOVEL_NOT_FOUND);
		}

		const existingChapter = await Chapter.findOne({
			novelId,
			chapterNumber: chapterData.chapterNumber
		});

		if (existingChapter) {
			throw new ValidationError(NOVEL_ERRORS.CHAPTER_EXISTS);
		}

		const chapter = await Chapter.create({
			...chapterData,
			novelId
		});

		return chapter;
	},

	async getChaptersByNovelId(novelId, query = {}) {
		const page = parseInt(query.page) || 1;
		const limit = parseInt(query.limit) || 20;
		const skip = (page - 1) * limit;

		const totalCount = await Chapter.countDocuments({
			novelId
		});

		if (totalCount === 0) {
			return {
				chapters: [],
				metadata: {
					total: 0,
					page,
					totalPages: 0
				}
			};
		}

		const chapters = await Chapter.find({
				novelId
			})
			.sort({
				chapterNumber: 1
			})
			.skip(skip)
			.limit(limit)
			.select('chapterNumber title status readCount wordCount estimatedReadTime createdAt lastUpdatedAt');

		return {
			chapters,
			metadata: {
				total: totalCount,
				page,
				totalPages: Math.ceil(totalCount / limit)
			}
		};
	},

	async getChapterByNumber(novelId, chapterNumber, opts = {}) {
		const query = Chapter.findOne({
			novelId,
			chapterNumber: parseInt(chapterNumber)
		});

		if (!opts.includeContent) {
			query.select('-content');
		}

		const chapter = await query.exec();

		if (!chapter) {
			throw new NotFoundError(NOVEL_ERRORS.CHAPTER_NOT_FOUND);
		}

		if (opts.includeContent) {
			chapter.incrementReadCount()
		}

		if (opts.includeNavigation) {
			const [prevChapter, nextChapter] = await Promise.all([
				Chapter.findOne({
					novelId,
					chapterNumber: {
						$lt: chapter.chapterNumber
					}
				})
				.sort({
					chapterNumber: -1
				})
				.select('chapterNumber')
				.lean(),
				Chapter.findOne({
					novelId,
					chapterNumber: {
						$gt: chapter.chapterNumber
					}
				})
				.sort({
					chapterNumber: 1
				})
				.select('chapterNumber')
				.lean()
			]);

			return {
				...chapter.toObject(),
				navigation: {
					prevChapter: prevChapter?.chapterNumber,
					nextChapter: nextChapter?.chapterNumber
				}
			};
		}

		return chapter;
	},

	async updateChapter(novelId, chapterNumber, updateData) {
		const chapter = await Chapter.findOneAndUpdate({
				novelId,
				chapterNumber
			},
			updateData, {
				new: true,
				runValidators: true
			}
		);

		if (!chapter) {
			throw new NotFoundError(NOVEL_ERRORS.CHAPTER_NOT_FOUND);
		}

		await Novel.findByIdAndUpdate(novelId, {
			$set: {
				lastUpdatedAt: new Date()
			}
		});

		return chapter;
	},

	async deleteChapter(novelId, chapterNumber) {
		const chapter = await Chapter.findOneAndDelete({
			novelId,
			chapterNumber
		});

		if (!chapter) {
			throw new NotFoundError(NOVEL_ERRORS.CHAPTER_NOT_FOUND);
		}

		await Novel.findByIdAndUpdate(novelId, {
			$inc: {
				totalChapters: -1
			},
			$set: {
				lastUpdatedAt: new Date()
			}
		});

		return chapter;
	}
};

module.exports = ChapterService;