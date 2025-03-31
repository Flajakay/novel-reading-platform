const express = require('express');
const RecommendationService = require('../services/recommendation/recommendation.service');
const { authJWT } = require('../middleware/authJWT');
const { validateRecommendationQuery, handleValidationErrors } = require('../middleware/recommendation.validation');
const { HTTP_STATUS, API_STATUS } = require('../utils/constants');
const logger = require('../utils/logger');

const router = express.Router();

// Get all recommendations
router.get('/',
    authJWT,
    validateRecommendationQuery,
    handleValidationErrors,
    async (req, res, next) => {
        try {
            const options = {
                limit: parseInt(req.query.limit) || 5,
                refresh: req.query.refresh === 'true'
            };
            
            const recommendations = await RecommendationService.getUserRecommendations(
                req.user.id,
                options
            );
            
            res.status(HTTP_STATUS.OK).json({
                status: API_STATUS.SUCCESS,
                data: recommendations
            });
        } catch (error) {
            next(error);
        }
    }
);

// Get "Because You Read" recommendations
router.get('/because-you-read',
    authJWT,
    validateRecommendationQuery,
    handleValidationErrors,
    async (req, res, next) => {
        try {
            const options = {
                limit: parseInt(req.query.limit) || 5
            };
            
            const recommendations = await RecommendationService.getSimilarNovelsRecommendations(
                req.user.id,
                options
            );
            
            res.status(HTTP_STATUS.OK).json({
                status: API_STATUS.SUCCESS,
                data: recommendations
            });
        } catch (error) {
            next(error);
        }
    }
);

// Get "Popular in Genre" recommendations
router.get('/popular-in-genre',
    authJWT,
    validateRecommendationQuery,
    handleValidationErrors,
    async (req, res, next) => {
        try {
            const options = {
                limit: parseInt(req.query.limit) || 5
            };
            
            const recommendations = await RecommendationService.getGenrePopularityRecommendations(
                req.user.id,
                options
            );
            
            res.status(HTTP_STATUS.OK).json({
                status: API_STATUS.SUCCESS,
                data: recommendations
            });
        } catch (error) {
            next(error);
        }
    }
);

// Get "From Authors You Follow" recommendations
router.get('/from-authors',
    authJWT,
    validateRecommendationQuery,
    handleValidationErrors,
    async (req, res, next) => {
        try {
            const options = {
                limit: parseInt(req.query.limit) || 5
            };
            
            const recommendations = await RecommendationService.getAuthorRecommendations(
                req.user.id,
                options
            );
            
            res.status(HTTP_STATUS.OK).json({
                status: API_STATUS.SUCCESS,
                data: recommendations
            });
        } catch (error) {
            next(error);
        }
    }
);

// Additional routes for other recommendation types will be added later
// router.get('/readers-like-you', ...);
// router.get('/continue-reading', ...);

module.exports = router;