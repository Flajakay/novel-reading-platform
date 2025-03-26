const express = require('express');
const NovelService = require('../services/novel.service');
const {
	validateNovel,
	validateSearch,
	validateAuthorNovels,
	validatePagination,
	handleValidationErrors,
	validateAnalyticsParams
} = require('../middleware/novel.validation');
const {
	isNovelAuthor
} = require('../middleware/ownership.middleware');
const {
	authJWT
} = require('../middleware/authJWT');
const { handleUpload } = require('../middleware/upload.middleware');
const {
	HTTP_STATUS, API_STATUS
} = require('../utils/constants');

const router = express.Router();

// Create a novel
// File upload handling is placed before validation to ensure 
// the file is available for validation if needed
router.post('/',
	authJWT,
	handleUpload,
	validateNovel,
	handleValidationErrors,
	async (req, res, next) => {
		try {
			const novel = await NovelService.createNovel(
				req.body, 
				req.user.id, 
				req.file
			);
			res.status(HTTP_STATUS.CREATED).json({
				status: API_STATUS.SUCCESS,
				data: novel
			});
		} catch (error) {
			next(error);
		}
	}
);

// Get all novels with search and filters
// No authentication required as this is a public endpoint
router.get('/',
    validateSearch, 
    handleValidationErrors,
    async (req, res, next) => {
        try {
            const novels = await NovelService.getNovels(req.query);
            res.status(HTTP_STATUS.OK).json({
                status: API_STATUS.SUCCESS,
                data: novels
            });
        } catch (error) {
            next(error);
        }
    }
);

// Get the authenticated user's novels
// Separate from the author/:authorId endpoint for better access control
router.get('/me',
    authJWT,
    validatePagination,
    handleValidationErrors,
    async (req, res, next) => {
        try {
            const result = await NovelService.getMyNovels(req.user.id, req.query);
            
            res.status(HTTP_STATUS.OK).json({
                status: API_STATUS.SUCCESS,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
);

// Get novel by ID
router.get('/:id', async (req, res, next) => {
	try {
		const novel = await NovelService.getNovelById(req.params.id);
		res.status(HTTP_STATUS.OK).json({
			status: API_STATUS.SUCCESS,
			data: novel
		});
	} catch (error) {
		next(error);
	}
});

// Get novel cover by ID
router.get('/:id/cover', async (req, res, next) => {
	try {
		const cover = await NovelService.getNovelCover(req.params.id);
		
		// Set the correct content type and send binary data
		res.set('Content-Type', cover.contentType);
		res.send(cover.data);
	} catch (error) {
		next(error);
	}
});

// Update novel
router.put('/:id',
	authJWT,
	handleUpload,
	validateNovel,
	isNovelAuthor,
	handleValidationErrors,
	async (req, res, next) => {
		try {
			const novel = await NovelService.updateNovel(
				req.params.id, 
				req.body, 
				req.file
			);
			res.status(HTTP_STATUS.OK).json({
				status: API_STATUS.SUCCESS,
				data: novel
			});
		} catch (error) {
			next(error);
		}
	}
);

// Delete novel cover
// Separate endpoint to allow removing a cover without requiring
// the entire novel data in the request
router.delete('/:id/cover',
	authJWT,
	isNovelAuthor,
	async (req, res, next) => {
		try {
			const novel = await NovelService.removeCover(req.params.id);
			res.status(HTTP_STATUS.OK).json({
				status: API_STATUS.SUCCESS,
				data: novel
			});
		} catch (error) {
			next(error);
		}
	}
);

// Delete novel
router.delete('/:id',
	authJWT,
	isNovelAuthor,
	async (req, res, next) => {
		try {
			await NovelService.deleteNovel(req.params.id);
			res.status(HTTP_STATUS.NO_CONTENT).send();
		} catch (error) {
			next(error);
		}
	}
);

// Add rating
router.post('/:id/ratings',
	authJWT,
	async (req, res, next) => {
		try {
			const novel = await NovelService.addRating(
				req.params.id,
				req.user.id,
				req.body.rating
			);
			res.status(HTTP_STATUS.OK).json({
				status: API_STATUS.SUCCESS,
				data: novel
			});
		} catch (error) {
			next(error);
		}
	}
);

// Increment view count
router.post('/:id/increment-view', async (req, res, next) => {
    try {
        const novel = await NovelService.incrementViewCount(req.params.id);
        res.status(HTTP_STATUS.OK).json({
            status: API_STATUS.SUCCESS,
            data: novel
        });
    } catch (error) {
        next(error);
    }
});

// Get novels by author ID
router.get('/author/:authorId',
    validateAuthorNovels,
    handleValidationErrors,
    async (req, res, next) => {
        try {
            const result = await NovelService.getNovelsByAuthorId(
                req.params.authorId,
                req.query
            );
            
            res.status(HTTP_STATUS.OK).json({
                status: API_STATUS.SUCCESS,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
);

// Get author's analytics
// Public endpoint providing aggregate statistics
// Detailed analytics would be behind authentication
router.get('/author/:authorId/analytics',
    validateAnalyticsParams,
    async (req, res, next) => {
        try {
            const analytics = await NovelService.getAuthorAnalytics(
                req.params.authorId,
                req.query.period
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

// Mount chapter routes as a nested resource
// This creates routes like /novels/:novelId/chapters
const chapterRoutes = require('./chapter.controller');
router.use('/:novelId/chapters', chapterRoutes);

module.exports = router;