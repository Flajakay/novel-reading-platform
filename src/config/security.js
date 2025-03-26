const helmet = require('helmet');
const logger = require('../utils/logger');

const securityConfig = helmet({
	contentSecurityPolicy: {
		directives: {
			// Default to self-origin for all resource types as a secure baseline
			defaultSrc: ["'self'"],
			// Allow inline scripts for flexibility, but only from controlled origins
			scriptSrc: ["'self'", "'unsafe-inline'", process.env.FRONTEND_URL],
			styleSrc: ["'self'", "'unsafe-inline'"],
			// Data URLs are allowed for embedded images; trusted external images permitted
			// This supports both embedded content and CDN-hosted images
			imgSrc: ["'self'", "data:", "https:", process.env.FRONTEND_URL],
			// Connect source includes frontend URL to support AJAX requests
			connectSrc: ["'self'", process.env.FRONTEND_URL],
			// Font sources need HTTPS and data URLs for embedded and external fonts
			fontSrc: ["'self'", "https:", "data:"],
			// Object source is restricted to none for security since not needed
			objectSrc: ["'none'"],
			// Media is restricted to same origin only
			mediaSrc: ["'self'"],
			// Frames are disabled entirely as they're not used and pose security risks
			frameSrc: ["'none'"],
			// Upgrade insecure requests only in production to avoid development hassles
			// This ensures all HTTP requests are upgraded to HTTPS in production
			upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
		},
	},
	// Cross-origin resource policy differs by environment:
	// - Production: same-site to prevent cross-site leaks
	// - Development: cross-origin to allow testing with different local domains/ports
	crossOriginResourcePolicy: {
		policy: process.env.NODE_ENV === 'production' ? "same-site" : "cross-origin"
	},
	// Prevents opening of links using window.opener relationship
	// This prevents tab nabbing attacks
	crossOriginOpenerPolicy: {
		policy: 'same-origin'
	},
	// Prevents browsers from trying to guess the MIME type
	// This prevents MIME confusion attacks, especially important for user uploads
	dnsPrefetchControl: true,
	// Prevents clickjacking by disallowing framing of the site
	frameguard: {
		action: 'DENY'
	},
	// HSTS is configured with these values for strong security:
	// - 1 year max age for long-term browser enforcement
	// - includeSubDomains to protect all subdomains
	// - preload to include in browser HSTS preload lists
	hsts: {
		maxAge: 31536000, // 1 year
		includeSubDomains: true,
		preload: true
	},
	ieNoOpen: true,
	noSniff: true,
	xssFilter: true,
	// Strict origin policy reduces information leakage in cross-origin requests
	// while still providing referrer information to same-origin targets
	referrerPolicy: {
		policy: 'strict-origin-when-cross-origin'
	}
});

// Custom middleware to detect proxy headers that could indicate potential spoofing attempts
// This helps identify when someone might be trying to manipulate the request chain
const detectProxyHeaders = (req, res, next) => {
	if (req.headers['x-forwarded-for'] || req.headers['x-forwarded-host']) {
		logger.logSecurityEvent('proxy_headers_detected', req.user, {
			headers: req.headers
		});
	}
	next();
};

const securityMiddleware = [securityConfig, detectProxyHeaders];

module.exports = securityMiddleware;