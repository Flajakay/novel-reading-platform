const {
	body,
	query,
	param
} = require('express-validator');
const {
	validationResult
} = require('express-validator');
const {
	ValidationError
} = require('../utils/errors');
const {
	HTTP_STATUS
} = require('../utils/constants');
// Common validation chains
const paginationRules = [
	query('page')
	.optional()
	.isInt({
		min: 1
	})
	.withMessage('Page must be a positive integer')
	.toInt(),
	query('limit')
	.optional()
	.isInt({
		min: 1,
		max: 100
	})
	.withMessage('Limit must be between 1 and 100')
	.toInt()
];

const statusRule =
	query('status')
	.optional()
	.isIn(['ongoing', 'completed'])
	.withMessage('Invalid status');

const sortingRules = {
	basic: query('sortBy')
		.optional()
		.isIn(['createdAt', '-createdAt', 'title', '-title', 'viewCount', '-viewCount'])
		.withMessage('Invalid sort parameter'),
	search: query('sortBy')
		.optional()
		.isIn(['relevance', 'rating', 'views', 'recent', 'chapters'])
		.withMessage('Invalid sort parameter')
};

const genresRule =
	body('genres')
	.customSanitizer(value => {
		if (Array.isArray(value)) return value;

		if (typeof value === 'string') {
			return value.split(',').map(item => item.trim()).filter(Boolean);
		}

		return [];
	})
	.isArray({
		max: 5
	})
	.withMessage('Maximum 5 genres allowed')
	.custom((value) => {
		if (value.some(genre => genre.length > 20)) {
			throw new Error('Each genre must not exceed 20 characters');
		}
		return true;
	});
  
const tagsRule =
	body('tags')
	.customSanitizer(value => {
		if (Array.isArray(value)) return value;

		if (typeof value === 'string') {
			return value.split(',').map(item => item.trim()).filter(Boolean);
		}

		return [];
	})
	.isArray({
		max: 10
	})
	.withMessage('Maximum 10 tags allowed')
	.custom((value) => {
		if (value.some(tag => tag.length > 20)) {
			throw new Error('Each tag must not exceed 20 characters');
		}
		return true;
	});

// Composed validation chains
const validateNovel = [
	body('title')
	.trim()
	.isLength({
		min: 3,
		max: 100
	})
	.withMessage('Title must be between 3 and 100 characters'),
	body('description')
	.trim()
	.isLength({
		max: 1000
	})
	.withMessage('Description must not exceed 1000 characters'),
	genresRule,
	statusRule,
	tagsRule
];

const validateAuthorNovels = [
	param('authorId')
	.isMongoId()
	.withMessage('Invalid author ID format'),
	...paginationRules,
	statusRule
];

const validateSearch = [
	...paginationRules,
	query('search')
	.optional()
	.isString()
	.trim()
	.isLength({
		max: 100
	})
	.withMessage('Search query too long'),
	sortingRules.search,
	query('author')
	.optional()
	.isString()
	.trim()
	.isLength({
		min: 3,
		max: 20
	})
	.withMessage('Author username must be between 3 and 20 characters')
	.matches(/^[a-zA-Z0-9_-]+$/)
	.withMessage('Author username can only contain letters, numbers, underscores and hyphens'),
	query('genres')
	.optional()
	.customSanitizer(value => Array.isArray(value) ? value : [value])
	.custom((value) => {
		if (!Array.isArray(value)) return true;
		if (value.length > 5) throw new Error('Maximum 5 genres allowed');
		if (value.some(genre => genre.length > 20)) {
			throw new Error('Each genre must not exceed 20 characters');
		}
		return true;
	}),
	query('tags')
	.optional()
	.customSanitizer(value => Array.isArray(value) ? value : [value])
	.custom((value) => {
		if (!Array.isArray(value)) return true;
		if (value.length > 10) throw new Error('Maximum 10 tags allowed');
		if (value.some(tag => tag.length > 20)) {
			throw new Error('Each tag must not exceed 20 characters');
		}
		return true;
	}),
	statusRule,
	query('minRating')
	.optional()
	.isFloat({
		min: 0,
		max: 5
	})
	.withMessage('Rating must be between 0 and 5')
	.toFloat(),
	query('mode')
	.optional()
	.isIn(['default'])
	.withMessage('Invalid mode parameter')
];



// Common pagination validation that can be used across different endpoints
const validatePagination = [
	...paginationRules,
	statusRule,
	sortingRules.basic
];

const handleValidationErrors = (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		throw new ValidationError('Validation failed', HTTP_STATUS.BAD_REQUEST, errors.array());
	}
	next();
};

const validateAnalyticsParams = [
    param('authorId')
        .isMongoId()
        .withMessage('Invalid author ID format'),
    
    query('period')
        .optional()
        .isInt({ min: 1, max: 90 })
        .withMessage('Period must be between 1 and 90 days'),
    
    handleValidationErrors
];

module.exports = {
	validateNovel,
	validateSearch,
	validateAuthorNovels,
	validatePagination,
	handleValidationErrors,
	paginationRules,
	statusRule,
	sortingRules,
	validateAnalyticsParams
};