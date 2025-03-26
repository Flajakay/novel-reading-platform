const app = require('./app');
const logger = require('./utils/logger');
const {
	TIMEOUTS
} = require('./utils/constants');

try {
	const server = app.listen(process.env.PORT, () => {
		logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${process.env.PORT}`);
	});

	const gracefulShutdown = () => {
		logger.info('Received shutdown signal. Starting graceful shutdown...');

		server.close(() => {
			logger.info('Server closed successfully');
			process.exit(0);
		});

		setTimeout(() => {
			logger.error('Could not close connections in time, forcefully shutting down');
			process.exit(1);
		}, TIMEOUTS.GRACEFUL_SHUTDOWN);
	};

	process.on('SIGTERM', gracefulShutdown);
	process.on('SIGINT', gracefulShutdown);

} catch (error) {
	logger.error('Failed to start server:', error);
	process.exit(1);
}