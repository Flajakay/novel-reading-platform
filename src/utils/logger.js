const winston = require('winston');
const path = require('path');

const readableFormat = winston.format.printf(({
	level,
	message,
	timestamp,
	stack,
	...metadata
}) => {
	let log = `${timestamp} | ${level} | ${message}`;

	// Add metadata if present
	if (Object.keys(metadata).length > 0 && metadata.error !== undefined) {
		log += `\nMetadata: ${JSON.stringify(metadata, null, 2)}`;
	}

	// Add stack trace for errors
	if (stack) {
		log += `\nStack Trace:\n${stack}`;
	}

	return log;
});

const logFormat = winston.format.combine(
	winston.format.timestamp({
		format: 'YYYY-MM-DD HH:mm:ss'
	}),
	winston.format.errors({
		stack: true
	}),
	winston.format.splat(),
	readableFormat
);

const consoleFormat = winston.format.combine(
	winston.format.timestamp({
		format: 'YYYY-MM-DD HH:mm:ss'
	}),
	winston.format.errors({
		stack: true
	}),
	winston.format.splat(),
	winston.format.colorize({
		all: true
	}),
	readableFormat
);

const logsDir = path.join(process.cwd(), 'logs');

const transports = [
	// Console transport with colors
	new winston.transports.Console({
		format: consoleFormat,
		level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
	}),
	// File transport for errors
	new winston.transports.File({
		filename: path.join(logsDir, 'error.log'),
		level: 'error',
		format: logFormat,
		maxsize: 5242880, // 5MB
		maxFiles: 5,
	}),
	// File transport for all logs
	new winston.transports.File({
		filename: path.join(logsDir, 'combined.log'),
		format: logFormat,
		maxsize: 5242880, // 5MB
		maxFiles: 5,
	}),
];

const logger = winston.createLogger({
	level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
	format: logFormat, // Default format for non-console transports
	transports,
	// Handle uncaught exceptions and rejections
	exceptionHandlers: [
		new winston.transports.File({
			filename: path.join(logsDir, 'exceptions.log'),
			format: logFormat,
			maxsize: 5242880, // 5MB
			maxFiles: 5,
		}),
	],
	rejectionHandlers: [
		new winston.transports.File({
			filename: path.join(logsDir, 'rejections.log'),
			format: logFormat,
			maxsize: 5242880, // 5MB
			maxFiles: 5,
		}),
	],
});

// Create a stream object for Morgan HTTP logging
logger.stream = {
	write: (message) => logger.info(message.trim()),
};

// Helper methods for structured logging
logger.logAPIError = (error, req) => {
	logger.error('API Error', {
		error: {
			message: error.message,
			stack: error.stack,
		},
		request: {
			method: req.method,
			url: req.url,
			params: req.params,
			query: req.query,
			user: req.user ? req.user.id : 'anonymous',
		},
	});
};

logger.logDBError = (error, operation) => {
	logger.error(`Database Error during ${operation}`, {
		error: {
			message: error.message,
			stack: error.stack,
		},
	});
};

logger.logSecurityEvent = (event, user, details) => {
	logger.warn(`Security Event: ${event}`, {
		user: user ? user.id : 'anonymous',
		details,
	});
};

module.exports = logger;