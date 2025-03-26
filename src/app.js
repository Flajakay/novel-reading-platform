require('dotenv').config();
const express = require('express');
const setupSwagger = require('./docs/swagger.js');

const validateEnv = require('./config/env.validation');
const connectDB = require('./config/database');
const configureExpress = require('./config/express');
const logger = require('./utils/logger');

const {
	errorHandler,
	notFound
} = require('./middleware/error.middleware');

validateEnv();

const app = express();

configureExpress(app);

setupSwagger(app);

app.use('/api', require('./api'));

app.use(notFound);

app.use(errorHandler);

connectDB();

process.on('uncaughtException', (error) => {
	logger.error('Uncaught Exception:', error);
	process.exit(1);
});

process.on('unhandledRejection', (error) => {
	logger.error('Unhandled Rejection:', error);
	process.exit(1);
});

module.exports = app;