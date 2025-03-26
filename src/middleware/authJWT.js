const jwt = require('jsonwebtoken');
const {
	ERROR_MESSAGES
} = require('../utils/constants');
const {
	AuthenticationError,
	AuthorizationError
} = require('../utils/errors');

// Main authentication middleware for JWT verification
// Used to protect routes that require authenticated access
const authJWT = async (req, res, next) => {
	const authHeader = req.headers.authorization;

	// Verify the Authorization header exists and has the Bearer scheme
	// This follows the OAuth 2.0 Bearer Token specification (RFC 6750)
	if (!authHeader?.startsWith('Bearer ')) {
		return next(new AuthenticationError(ERROR_MESSAGES.MISSING_TOKEN));
	}

	const token = authHeader.split(' ')[1];

	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET);

		// Verify this is an access token, not a refresh token
		// This separation of token types is a security measure to prevent
		// refresh tokens (which are longer-lived) from being used for API access
		if (decoded.type !== 'access') {
			throw new AuthenticationError(INVALID_TOKEN_TYPE);
		}

		// Add user data to the request object for use in route handlers
		// Only essential user information is included to minimize the payload
		req.user = {
			id: decoded.userId,
			email: decoded.email,
			role: decoded.role
		};
		next();
	} catch (error) {
		if (error.name === 'TokenExpiredError') {
			return next(new AuthenticationError(ERROR_MESSAGES.ACCESS_TOKEN_EXPIRED));
		}
		next(new AuthenticationError(ERROR_MESSAGES.INVALID_TOKEN));
	}
};

// Role-based authorization middleware factory
// Returns a middleware function that checks if the authenticated user has one of the allowed roles
// This is separate from authentication to follow the single responsibility principle
const authorize = (...roles) => (req, res, next) => {
	if (!req.user || !roles.includes(req.user.role)) {
		return next(new AuthorizationError(ERROR_MESSAGES.FORBIDDEN));
	}
	next();
};

module.exports = {
	authJWT,
	authorize
};