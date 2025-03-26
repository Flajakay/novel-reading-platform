const logger = require('../utils/logger');

const envVariables = {
	// Server
	NODE_ENV: {
		required: true,
		values: ['development', 'production']
	},
	PORT: {
		required: true,
		type: 'number',
		default: 5000
	},

	// MongoDB
	MONGODB_URI: {
		required: true,
		type: 'string'
	},

	// JWT
	JWT_SECRET: {
		required: true,
		minLength: 32
	},
	JWT_ACCESS_EXPIRATION: {
		required: true,
		type: 'string',
		default: '24h'
	},
	JWT_REFRESH_EXPIRATION: {
		required: true,
		type: 'string',
		default: '30d'
	},

	// CORS
	FRONTEND_URL: {
		required: true,
		type: 'string'
	},

	// Optional services
	SMTP_HOST: {
		required: false
	},
	SMTP_PORT: {
		required: false,
		type: 'number'
	},
	SMTP_USER: {
		required: false
	},
	SMTP_PASS: {
		required: false
	},
	
	
	// Elastic search
	
	ELASTICSEARCH_NODE: {
		required: true,
		type: 'string',
		default: 'http://localhost:9200'
	},
	
	ELASTICSEARCH_USERNAME: {
		required: false,
		type: 'string',
		default: ''
	},
	ELASTICSEARCH_PASSWORD: {
		required: false,
		type: 'string',
		default: ''
	}

};

function validateEnv() {
	const errors = [];

	for (const [key, rules] of Object.entries(envVariables)) {
		let value = process.env[key];

		// Check if required
		if (rules.required && !value) {
			if (rules.default !== undefined) {
				process.env[key] = rules.default;
				logger.warn(`Environment variable ${key} not set, using default value: ${rules.default}`);
				continue;
			}
			errors.push(`Required environment variable ${key} is missing`);
			continue;
		}

		// Skip validation for optional empty variables
		if (!rules.required && !value) {
			continue;
		}

		// Type validation
		if (rules.type === 'number') {
			const num = Number(value);
			if (isNaN(num)) {
				errors.push(`Environment variable ${key} must be a number`);
			} else {
				process.env[key] = num;
			}
		}

		// Values validation
		if (rules.values && !rules.values.includes(value)) {
			errors.push(`Environment variable ${key} must be one of: ${rules.values.join(', ')}`);
		}

		// Length validation
		if (rules.minLength && value.length < rules.minLength) {
			errors.push(`Environment variable ${key} must be at least ${rules.minLength} characters long`);
		}
	}

	// Handle validation errors
	if (errors.length > 0) {
		logger.error('Environment validation failed:');
		errors.forEach(error => logger.error(`  - ${error}`));
		process.exit(1);
	}

	logger.info('Environment variables validated successfully');
}

module.exports = validateEnv;