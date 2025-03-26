const express = require('express');
const ChapterService = require('../services/chapter.service');
const { validateChapter, validateChapterQuery, validateStatistics, handleValidationErrors } = require('../middleware/chapter.validation');
const { authJWT } = require('../middleware/authJWT');
const { HTTP_STATUS, API_STATUS } = require('../utils/constants');
const { isNovelAuthor } = require('../middleware/ownership.middleware');

// The router is created with mergeParams: true to access parent router parameters
// This is essential to access novelId from the parent route (/novels/:novelId/chapters)
const router = express.Router({ mergeParams: true });

// Note: These statistic routes must be defined before the /:chapterNumber routes
// because Express would otherwise interpret 'statistics' as a chapter number parameter
// Order matters in Express route definitions to avoid parameter collision

// Get chapter statistics - Must come before /:chapterNumber routes
router.get('/statistics',
    validateStatistics,
    handleValidationErrors,
    async (req, res, next) => {
        try {
            const stats = await ChapterService.getChapterStatistics(
                req.params.novelId,
                req.query.period
            );
            res.status(HTTP_STATUS.OK).json({
                status: API_STATUS.SUCCESS,
                data: stats
            });
        } catch (error) {
            next(error);
        }
    }
);

// Get reading analytics - Must come before /:chapterNumber routes
router.get('/analytics',
    async (req, res, next) => {
        try {
            const analytics = await ChapterService.getReadingAnalytics(
                req.params.novelId
            );
            res.status(HTTP_STATUS.OK).json({
                status: API_STATUS.SUCCESS,
                data: analytics
            });
        } catch (error) {
            next(error);
        }
    }
);

// Create chapter
router.post('/',
    authJWT,
    validateChapter,
    // Ownership verification happens after validation to avoid unnecessary DB queries
    // for requests with invalid data
    isNovelAuthor,
    handleValidationErrors,
    async (req, res, next) => {
        try {
            const chapter = await ChapterService.createChapter(
                req.params.novelId,
                req.body
            );
            res.status(HTTP_STATUS.CREATED).json({
                status: API_STATUS.SUCCESS,
                data: chapter
            });
        } catch (error) {
            next(error);
        }
    }
);

// Get all chapters of a novel
router.get('/',
    validateChapterQuery,
    handleValidationErrors,
    async (req, res, next) => {
        try {
            const chapters = await ChapterService.getChaptersByNovelId(
                req.params.novelId,
                req.query
            );
            res.status(HTTP_STATUS.OK).json({
                status: API_STATUS.SUCCESS,
                data: chapters
            });
        } catch (error) {
            next(error);
        }
    }
);

// Get specific chapter
router.get('/:chapterNumber',
    validateChapterQuery,
    handleValidationErrors,
    async (req, res, next) => {
        try {
            const chapter = await ChapterService.getChapterByNumber(
                req.params.novelId,
                req.params.chapterNumber,
                {
                    // Default behavior is to include content unless explicitly set to 'false'
                    // This allows for fetching chapter metadata only when needed
                    includeContent: req.query.includeContent !== 'false',
                    // Navigation links are only included when explicitly requested
                    // to reduce unnecessary processing for most reads
                    includeNavigation: req.query.includeNavigation === 'true'
                }
            );
            res.status(HTTP_STATUS.OK).json({
                status: API_STATUS.SUCCESS,
                data: chapter
            });
        } catch (error) {
            next(error);
        }
    }
);

// Update chapter
router.put('/:chapterNumber',
    authJWT,
    validateChapter,
    isNovelAuthor,
    handleValidationErrors,
    async (req, res, next) => {
        try {
            const chapter = await ChapterService.updateChapter(
                req.params.novelId,
                req.params.chapterNumber,
                req.body
            );
            res.status(HTTP_STATUS.OK).json({
                status: API_STATUS.SUCCESS,
                data: chapter
            });
        } catch (error) {
            next(error);
        }
    }
);

// Delete chapter
router.delete('/:chapterNumber',
    authJWT,
    isNovelAuthor,
    async (req, res, next) => {
        try {
            await ChapterService.deleteChapter(
                req.params.novelId,
                req.params.chapterNumber
            );
            res.status(HTTP_STATUS.NO_CONTENT).send();
        } catch (error) {
            next(error);
        }
    }
);

module.exports = router;