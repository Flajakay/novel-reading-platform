const {
	body
} = require('express-validator');
const {
	validationResult
} = require('express-validator');
const {
	ValidationError
} = require('../utils/errors');
const {
	HTTP_STATUS,
	AUTH_ERRORS
} = require('../utils/constants');
const logger = require('../utils/logger');

const validateRegistration = [
	body('email')
	.trim()
	.isEmail()
	.withMessage(AUTH_ERRORS.INVALID_EMAIL_FORMAT)
	.normalizeEmail()
	.isLength({
		max: 100
	})
	.withMessage(AUTH_ERRORS.EMAIL_TOO_LONG),

	body('username')
	.trim()
	.isLength({
		min: 3,
		max: 20
	})
	.withMessage(AUTH_ERRORS.USERNAME_LENGTH)
	.matches(/^[a-zA-Z0-9_-]+$/)
	.withMessage(AUTH_ERRORS.USERNAME_FORMAT),

	body('dateOfBirth')
	.notEmpty()
	.withMessage(AUTH_ERRORS.DOB_REQUIRED)
	.isISO8601()
	.withMessage(AUTH_ERRORS.INVALID_DATE_FORMAT)
	.custom((value) => {
		const dob = new Date(value);
		const today = new Date();
		const thirteenYearsAgo = new Date();
		thirteenYearsAgo.setFullYear(today.getFullYear() - 13);

		if (dob > today) {
			throw new ValidationError(AUTH_ERRORS.FUTURE_DATE);
		}

		if (dob > thirteenYearsAgo) {
			throw new ValidationError(AUTH_ERRORS.MIN_AGE_REQUIRED);
		}

		const maxDate = new Date();
		maxDate.setFullYear(today.getFullYear() - 120);

		if (dob < maxDate) {
			throw new ValidationError(AUTH_ERRORS.INVALID_DOB);
		}

		return true;
	}),

	// Password strength requirements enforce security best practices
	// Requiring uppercase, lowercase, and numbers creates stronger passwords
	// while keeping requirements reasonable for users
	body('password')
	.isLength({
		min: 8
	})
	.withMessage(AUTH_ERRORS.PASSWORD_LENGTH)
	.matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d\W_]{8,}$/)
	.withMessage(AUTH_ERRORS.PASSWORD_REQUIREMENTS)
];

const validateLogin = [
	body('email')
	.trim()
	.isEmail()
	.withMessage(AUTH_ERRORS.INVALID_EMAIL_FORMAT)
	.normalizeEmail(),
	body('password')
	.notEmpty()
	.withMessage(AUTH_ERRORS.PASSWORD_REQUIRED)
];

const validateRefreshToken = [
	body('refreshToken')
	.notEmpty()
	.withMessage(AUTH_ERRORS.REFRESH_TOKEN_REQUIRED)
];

const validatePasswordResetRequest = [
	body('email')
	.trim()
	.isEmail()
	.withMessage(AUTH_ERRORS.INVALID_EMAIL_FORMAT)
	.normalizeEmail()
];

const validatePasswordReset = [
	body('token')
	.trim()
	.notEmpty()
	.withMessage(AUTH_ERRORS.RESET_TOKEN_REQUIRED),
	body('newPassword')
	.isLength({
		min: 8
	})
	.withMessage(AUTH_ERRORS.PASSWORD_LENGTH)
	.matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d\W_]{8,}$/)
	.withMessage(AUTH_ERRORS.PASSWORD_REQUIREMENTS)
];

// Custom validation handler formats errors into a standardized structure
// This creates consistent error responses across the API
const handleValidationErrors = (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const validationError = new ValidationError('Validation failed');
		validationError.errors = errors.array().map(error => ({
			path: error.path,
			msg: error.msg,
			value: error.value
		}));
		throw validationError;
	}
	next();
};
module.exports = {
	validateRegistration,
	validateLogin,
	validateRefreshToken,
	validatePasswordResetRequest,
	validatePasswordReset,
	handleValidationErrors,
};