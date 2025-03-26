const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');
const timeout = require('express-timeout-handler');
const cors = require('./cors');
const security = require('./security');
const logger = require('../utils/logger');
const {
	initializeElasticsearch
} = require('./elasticsearch');
const syncService = require('../services/sync.service');
const crypto = require('crypto');
const {
	FILE_SIZES,
	HTTP_STATUS,
	ERROR_MESSAGES,
	RATE_LIMITS,
	TIMEOUTS
} = require('../utils/constants');

const configureExpress = (app) => {
	// Disable x-powered-by header in production to minimize information disclosure about the server
	if (process.env.NODE_ENV === 'production') {
		app.disable('x-powered-by');
	}

	// Request timeout is configured before other middleware to ensure
	// all routes are subject to the timeout limit
	app.use(timeout.handler({
		timeout: TIMEOUTS.CONNECT,
		onTimeout: function(req, res) {
			res.status(HTTP_STATUS.SERVICE_UNAVAILABLE)
				.json({
					status: 'error',
					message: ERROR_MESSAGES.TIMEOUT
				});
		}
	}));

	app.use(security);

	app.use(cors);

	app.use(express.json({
		limit: FILE_SIZES.JSON_LIMIT
	}));
	app.use(express.urlencoded({
		extended: true,
		limit: FILE_SIZES.URLENCODED_LIMIT
	}));

	app.use(mongoSanitize());

	app.use(compression());

	// Rate limiting protects against brute force and DoS attacks
	// Applied only to /api routes as these are the public-facing endpoints
	const limiter = rateLimit({
		windowMs: RATE_LIMITS.API.windowMs,
		max: RATE_LIMITS.API.max,
		message: ERROR_MESSAGES.TOO_MANY_REQUESTS,
		standardHeaders: true,
		legacyHeaders: false,
	});
	app.use('/api', limiter);

	// Request logging middleware captures request information
	// and response timing for monitoring and debugging
	app.use((req, res, next) => {
		const startTime = Date.now();
		const logData = {
			method: req.method,
			path: req.path,
			ip: req.headers['x-forwarded-for']?.split(',')[0] || req.ip,
			userId: req.user?.id,
			// Correlation ID allows tracking requests across services
			// If not provided in headers, generate a new UUID for traceability
			correlationId: req.headers['x-correlation-id'] || crypto.randomUUID()
		};

		// Include additional debug information in non-production environments
		// but filter out sensitive data for security
		if (process.env.NODE_ENV !== 'production') {
			const safeHeaders = {
				...req.headers
			};
			const sensitiveFields = ['authorization', 'cookie', 'x-api-key', 'password'];
			sensitiveFields.forEach(field => delete safeHeaders[field]);
			logData.headers = safeHeaders;
			logData.query = req.query;
		}

		// Complete the log entry when the response is finished
		// This ensures accurate timing and status code information
		res.on('finish', () => {
			logData.statusCode = res.statusCode;
			logData.responseTime = Date.now() - startTime;

			const level = res.statusCode >= 400 ? 'error' : 'info';
			logger[level]('Request completed', logData);
		});

		next();
	});

	// Root endpoint with environment-specific responses
	// Production returns minimal information, development includes helpful details
	app.get('/', (req, res) => {
		if (process.env.NODE_ENV === 'production') {
			return res.status(200).json({
				status: 'ok'
			});
		}

		res.json({
			message: 'Welcome to the Novel Reading API',
			version: process.env.npm_package_version || '1.0.0',
			endpoints: {
				api: '/api',
				docs: '/api/docs',
				health: '/api/health'
			}
		});
	});

	// Initialize Elasticsearch and data synchronization
	// This is done after Express configuration but before server start
	// to ensure search functionality is available when the app starts serving requests
	initializeElasticsearch()
		.then(async () => {
			try {
				// Perform initial sync to ensure Elasticsearch data matches MongoDB
				await syncService.initializeSync();

				// Schedule periodic sync verification to catch any data drift
				// 24-hour interval balances thoroughness with performance impact
				setInterval(() => {
					syncService.verifySync().catch(error => {
						logger.error('Scheduled sync verification failed:', error);
					});
				}, 24 * 60 * 60 * 1000);

				logger.info('Elasticsearch initialized and synchronized successfully');
			} catch (error) {
				logger.error('Failed to initialize sync:', error);
				// Exit in production since search is a critical feature
				// In development, continue to allow work on other features
				if (process.env.NODE_ENV === 'production') {
					process.exit(1);
				}
			}
		})
		.catch(error => {
			logger.error('Failed to initialize Elasticsearch:', error);
			// Same exit behavior as above for consistency
			if (process.env.NODE_ENV === 'production') {
				process.exit(1);
			}
		});

	return app;
};

module.exports = configureExpress;