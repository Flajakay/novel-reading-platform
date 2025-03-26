const {
	HTTP_STATUS,
	ERROR_MESSAGES,
	API_STATUS
} = require('./constants');

class AppError extends Error {
	constructor(message, statusCode, isOperational = true) {
		super(message);
		this.statusCode = statusCode;
		this.status = `${statusCode}`.startsWith('4') ? API_STATUS.FAIL : API_STATUS.ERROR;
		this.isOperational = isOperational;
		Error.captureStackTrace(this, this.constructor);
	}
}

class ValidationError extends AppError {
	constructor(message = ERROR_MESSAGES.INVALID_INPUT, statusCode = HTTP_STATUS.BAD_REQUEST, errors = null) {
		super(message, statusCode);
		this.name = 'ValidationError';
		this.errors = errors;
	}
}

class AuthenticationError extends AppError {
	constructor(message = ERROR_MESSAGES.UNAUTHORIZED) {
		super(message, HTTP_STATUS.UNAUTHORIZED);
		this.name = 'AuthenticationError';
	}
}

class AuthorizationError extends AppError {
	constructor(message = ERROR_MESSAGES.FORBIDDEN) {
		super(message, HTTP_STATUS.FORBIDDEN);
		this.name = 'AuthorizationError';
	}
}

class NotFoundError extends AppError {
	constructor(resource = 'Resource') {
		super(`${resource} not found`, HTTP_STATUS.NOT_FOUND);
		this.name = 'NotFoundError';
	}
}

class ConflictError extends AppError {
	constructor(message = ERROR_MESSAGES.USER_EXISTS) {
		super(message, HTTP_STATUS.CONFLICT);
		this.name = 'ConflictError';
	}
}

module.exports = {
	AppError,
	ValidationError,
	AuthenticationError,
	AuthorizationError,
	NotFoundError,
	ConflictError
};