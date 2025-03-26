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

const validateChapter = [
	body('chapterNumber')
	.isInt({
		min: 1
	})
	.withMessage('Chapter number must be a positive integer')
	// Custom validation prevents changing chapter numbers on update
	// This avoids complex re-ordering operations and potential data inconsistencies
	.custom((value, {
		req
	}) => {
		if (req.method === 'PUT' && req.params.chapterNumber != value) {
			throw new Error('Chapter number cannot be changed');
		}
		return true;
	}),

	body('title')
	.trim()
	.isLength({
		min: 1,
		max: 200
	})
	.withMessage('Title must be between 1 and 200 characters'),

	body('content')
	.trim()
	.isLength({
		min: 100
	})
	.withMessage('Content must be at least 100 characters long')
	.isLength({
		max: 50000
	})
	.withMessage('Content exceeds maximum length of 50,000 characters'),
	// Content length limits strike a balance between allowing substantial chapters
	// while preventing excessive server load and response size issues

	body('status')
	.optional()
	.isIn(['draft', 'published'])
	.withMessage('Status must be either draft or published')
];

const validateChapterQuery = [
	query('page')
	.optional()
	.isInt({
		min: 1
	})
	.withMessage('Page must be a positive integer'),

	query('limit')
	.optional()
	.isInt({
		min: 1,
		max: 50
	})
	.withMessage('Limit must be between 1 and 50'),

	query('includeContent')
	.optional()
	.isBoolean()
	.withMessage('includeContent must be a boolean')
	// This option allows clients to request metadata only when appropriate
	// which reduces bandwidth usage for listing views
];

const validateStatistics = [
	query('period')
	.optional()
	.isInt({
		min: 1,
		max: 90
	})
	.withMessage('Period must be between 1 and 90 days')
];

const handleValidationErrors = (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		throw new ValidationError('Validation failed', HTTP_STATUS.BAD_REQUEST, errors.array());
	}
	next();
};
module.exports = {
	validateChapter,
	validateChapterQuery,
	validateStatistics,
	handleValidationErrors
};