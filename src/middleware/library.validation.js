const { body, query, param } = require('express-validator');
const { validationResult } = require('express-validator');
const { ValidationError } = require('../utils/errors');
const { HTTP_STATUS, LIBRARY_STATUS } = require('../utils/constants');

const validateLibraryItem = [
    body('status')
        .optional()
        .isIn(Object.values(LIBRARY_STATUS))
        .withMessage(`Invalid library status. Must be one of: ${Object.values(LIBRARY_STATUS).join(', ')}`),
    
    body('notes')
        .optional()
        .isString()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Notes must not exceed 500 characters')
];

const validateLibraryQuery = [
    query('status')
        .optional()
        .isIn(Object.values(LIBRARY_STATUS))
        .withMessage(`Invalid status filter. Must be one of: ${Object.values(LIBRARY_STATUS).join(', ')}`),
    
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer')
        .toInt(),
    
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100')
        .toInt()
];

const validateStatusUpdate = [
    body('status')
        .isIn(Object.values(LIBRARY_STATUS))
        .withMessage(`Invalid library status. Must be one of: ${Object.values(LIBRARY_STATUS).join(', ')}`)
];

const validateLastReadUpdate = [
    body('chapterNumber')
        .isInt({ min: 1 })
        .withMessage('Chapter number must be a positive integer')
        .toInt()
];

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ValidationError('Validation failed', HTTP_STATUS.BAD_REQUEST, errors.array());
    }
    next();
};

module.exports = {
    validateLibraryItem,
    validateLibraryQuery,
    validateStatusUpdate,
    validateLastReadUpdate,
    handleValidationErrors
};