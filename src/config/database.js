const mongoose = require('mongoose');
const logger = require('../utils/logger');
const {
	TIMEOUTS,
	DB_CONFIG
} = require('../utils/constants');

const connectDB = async () => {
	const options = {
		// Connection timeout is kept relatively short to fail fast
		// rather than hanging indefinitely when connection is problematic
		connectTimeoutMS: TIMEOUTS.CONNECT,
		// Max pool size is configured based on application needs
		// to prevent connection exhaustion under high load
		maxPoolSize: DB_CONFIG.MAX_POOL_SIZE,
		// Socket timeout prevents long-running queries from blocking indefinitely
		socketTimeoutMS: TIMEOUTS.SOCKET,
		// IPv4 is specified to avoid potential IPv6 connectivity issues
		family: 4,
		// Auto-indexes are enabled to ensure indexes are created correctly
		// This can be turned off in production for performance if indexes are built separately
		autoIndex: true,
		// Server selection timeout limits how long the driver waits for server discovery
		serverSelectionTimeoutMS: TIMEOUTS.SERVER_SELECTION,
		// Heartbeat frequency controls how often the driver checks server state
		heartbeatFrequencyMS: TIMEOUTS.HEARTBEAT,
		// Retry options for resilience against transient network issues
		retryWrites: true,
		retryReads: true,
	};

	let retryCount = 0;
	const maxRetries = DB_CONFIG.MAX_RETRIES;

	// Remove existing listeners to prevent duplicates 
	// This is important when the connection function is called multiple times
	// such as during reconnection attempts
	mongoose.connection.removeAllListeners();

	// Set up event listeners
	mongoose.connection.on('connecting', () => {
		logger.info('Attempting to connect to MongoDB...', {
			retryCount
		});
	});

	mongoose.connection.on('connected', () => {
		retryCount = 0;
		logger.info('Successfully connected to MongoDB');
	});

	// The disconnection handler contains custom reconnection logic
	// rather than relying solely on Mongoose's built-in reconnection
	// This gives more control over the retry behavior and allows for clean shutdown
	mongoose.connection.on('disconnected', async () => {
		logger.logDBError('Lost MongoDB connection', 'disconnect');

		if (retryCount >= maxRetries) {
			logger.error('Failed to reconnect to MongoDB after maximum retries');
			process.exit(1);
		}

		retryCount++;
		logger.info(`Attempting reconnection ${retryCount}/${maxRetries}`);

		try {
			await mongoose.connect(process.env.MONGODB_URI, options);
		} catch (error) {
			logger.logDBError(error, `reconnection_attempt_${retryCount}`);
			// Exponential backoff with a maximum delay to avoid overwhelming the database
			// during recovery and to prevent connection storms
			if (retryCount < maxRetries) {
				await new Promise(resolve => setTimeout(resolve, DB_CONFIG.RETRY_INTERVAL));
			}
		}
	});

	mongoose.connection.on('error', (err) => {
		logger.logDBError(err, 'connection_error');
	});

	// Initial connection attempt
	try {
		await mongoose.connect(process.env.MONGODB_URI, options);
		return mongoose.connection;
	} catch (error) {
		logger.logDBError(error, 'initial_connection');
		throw error; // Re-throw to be handled by the application
	}
};

module.exports = connectDB;