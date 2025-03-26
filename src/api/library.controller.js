const express = require('express');
const LibraryService = require('../services/library.service');
const { 
    validateLibraryItem, 
    validateLibraryQuery, 
    validateStatusUpdate,
    validateLastReadUpdate,
    handleValidationErrors 
} = require('../middleware/library.validation');
const { authJWT } = require('../middleware/authJWT');
const { HTTP_STATUS, API_STATUS } = require('../utils/constants');

const router = express.Router();

// All library routes require authentication since they're user-specific
// This could be applied globally to all routes in this controller, but is applied 
// to each route individually for clarity and to make it explicit

// Get user library
router.get('/',
    authJWT,
    validateLibraryQuery,
    handleValidationErrors,
    async (req, res, next) => {
        try {
            const library = await LibraryService.getUserLibrary(req.user.id, req.query);
            res.status(HTTP_STATUS.OK).json({
                status: API_STATUS.SUCCESS,
                data: library
            });
        } catch (error) {
            next(error);
        }
    }
);

// Add novel to library
router.post('/:novelId',
    authJWT,
    validateLibraryItem,
    handleValidationErrors,
    async (req, res, next) => {
        try {
            const libraryItem = await LibraryService.addToLibrary(
                req.user.id,
                req.params.novelId,
                req.body.status,
                req.body.notes
            );
            // Returns 200 OK instead of 201 Created because this endpoint
            // handles both creation and update (upsert behavior)
            res.status(HTTP_STATUS.OK).json({
                status: API_STATUS.SUCCESS,
                data: libraryItem
            });
        } catch (error) {
            next(error);
        }
    }
);

// Remove novel from library
router.delete('/:novelId',
    authJWT,
    async (req, res, next) => {
        try {
            await LibraryService.removeFromLibrary(
                req.user.id,
                req.params.novelId
            );
            res.status(HTTP_STATUS.NO_CONTENT).send();
        } catch (error) {
            next(error);
        }
    }
);

// Update status of novel in library
router.patch('/:novelId/status',
    authJWT,
    validateStatusUpdate,
    handleValidationErrors,
    async (req, res, next) => {
        try {
            const libraryItem = await LibraryService.updateLibraryItemStatus(
                req.user.id,
                req.params.novelId,
                req.body.status
            );
            res.status(HTTP_STATUS.OK).json({
                status: API_STATUS.SUCCESS,
                data: libraryItem
            });
        } catch (error) {
            next(error);
        }
    }
);

// Update last read chapter
// PATCH is used instead of PUT since we're updating only a specific field
// of the library item, not replacing the entire resource
router.patch('/:novelId/last-read',
    authJWT,
    validateLastReadUpdate,
    handleValidationErrors,
    async (req, res, next) => {
        try {
            const libraryItem = await LibraryService.updateLastReadChapter(
                req.user.id,
                req.params.novelId,
                req.body.chapterNumber
            );
            res.status(HTTP_STATUS.OK).json({
                status: API_STATUS.SUCCESS,
                data: libraryItem
            });
        } catch (error) {
            next(error);
        }
    }
);

// Check if novel is in user's library
// Separate endpoint for efficiency - allows quick checks without retrieving full library
router.get('/:novelId/check',
    authJWT,
    async (req, res, next) => {
        try {
            const libraryInfo = await LibraryService.checkNovelInLibrary(
                req.user.id,
                req.params.novelId
            );
            res.status(HTTP_STATUS.OK).json({
                status: API_STATUS.SUCCESS,
                data: {
                    // Boolean flag for easy client-side conditional rendering
                    inLibrary: !!libraryInfo,
                    ...libraryInfo
                }
            });
        } catch (error) {
            next(error);
        }
    }
);

module.exports = router;