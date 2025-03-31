const { body, query, validationResult } = require('express-validator');
const { ValidationError } = require('../utils/errors');

const validateRecommendationQuery = [
    query('limit')
        .optional()
        .isInt({ min: 1, max: 20 })
        .withMessage('Limit must be between 1 and 20'),
    query('refresh')
        .optional()
        .isBoolean()
        .withMessage('Refresh must be a boolean value')
];

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => ({
            field: error.param,
            message: error.msg
        }));
        
        throw new ValidationError('Validation failed', errorMessages);
    }
    
    next();
};

module.exports = {
    validateRecommendationQuery,
    handleValidationErrors
};