const logger = require('../utils/logger');
const {
	AppError
} = require('../utils/errors');
const {
	HTTP_STATUS,
	ERROR_MESSAGES
} = require('../utils/constants');

const formatStackTrace = (stack) => {
	if (!stack) return [];

	// Transforms raw stack trace into a structured format for better debugging
	// by extracting only the essential information: function, file, line, column
	return stack
		.split('\n')
		.slice(1)
		.map(line => {
			const match = line.match(/at\s+(.*?)\s+\((.*?):(\d+):(\d+)\)/);
			if (match) {
				return {
					function: match[1],
					file: match[2].split('\\').pop(), // Extract just the filename, not the full path for security
					line: parseInt(match[3]),
					column: parseInt(match[4])
				};
			}
			return null;
		})
		.filter(Boolean);
};

const errorHandler = (err, req, res, next) => {
	err.statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
	err.status = err.status || 'error';

	// Log the error
	logger.logAPIError(err, req);

	// Base error response
	const errorResponse = {
		status: err.status,
		code: err.statusCode,
		// Use generic message for non-operational errors to prevent leaking sensitive information
		message: err.isOperational ? err.message : ERROR_MESSAGES.SERVER_ERROR
	};

	// Add validation errors if they exist
	if (err.errors) {
		errorResponse.errors = err.errors.map(error => ({
			field: error.path || error.param, // Support both formats of validation errors
			message: error.msg
		}));
	}

	// Include detailed debug information only in development environment
	// to help developers but not expose sensitive information in production
	if (process.env.NODE_ENV === 'development') {
		errorResponse.debug = {
			name: err.name,
			stackTrace: formatStackTrace(err.stack),
			timestamp: new Date().toISOString()
		};
	}

	res.status(err.statusCode).json(errorResponse);
};

const notFound = (req, res, next) => {
	next(new AppError(`Can't find ${req.originalUrl} on this server`, HTTP_STATUS.NOT_FOUND));
};

module.exports = {
	errorHandler,
	notFound
};