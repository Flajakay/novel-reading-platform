const cors = require('cors');
const {
	ERROR_MESSAGES
} = require('../utils/constants');

const corsOptions = {
	// Dynamic origin validation allows for flexibility in multi-environment deployments
	// without hardcoding all possible origins
	origin: (origin, callback) => {
		// Parse ALLOWED_ORIGINS into an array if it exists
		// This allows for multiple origins to be specified in a single env variable
		const additionalOrigins = process.env.ALLOWED_ORIGINS ?
			process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()) : [];

		const allowedOrigins = [
			process.env.FRONTEND_URL,
			...additionalOrigins
		].filter(Boolean); // Remove any undefined/null values

		// For development tools like Postman that don't send an origin header,
		// !origin will be true. This also allows server-to-server requests.
		// Using startsWith instead of exact match allows for subdomains and different ports
		if (!origin || allowedOrigins.some(allowed => origin.startsWith(allowed))) {
			callback(null, true);
		} else {
			callback(new Error(ERROR_MESSAGES.CORS_ERROR));
		}
	},
	methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
	// Only expose essential headers to avoid information leakage
	allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
	// Expose pagination headers for frontend consumption
	exposedHeaders: ['Content-Range', 'X-Content-Range'],
	// Allows cookies to be included in cross-domain requests when using credentials: 'include'
	credentials: true,
	// Cache preflight responses for 24 hours to reduce OPTIONS requests
	maxAge: 86400, // 24 hours
	preflightContinue: false,
	// 204 is preferred over 200 for OPTIONS responses as it has no body
	optionsSuccessStatus: 204
};

module.exports = cors(corsOptions);