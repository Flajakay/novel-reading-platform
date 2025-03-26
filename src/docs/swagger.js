const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const path = require('path');

const options = {
	definition: {
		openapi: '3.0.0',
		info: {
			title: 'Novel Reading API',
			version: '0.0.1',
			description: 'API documentation for the Novel Reading Platform'
		},
		servers: [{
			url: process.env.NODE_ENV === 'production' ?
				process.env.API_URL :
				`http://localhost:${process.env.PORT || 5000}/api`,
			description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server'
		}],
		components: {
			securitySchemes: {
				bearerAuth: {
					type: 'http',
					scheme: 'bearer',
					bearerFormat: 'JWT'
				}
			}
		}
	},
	apis: [
		path.join(__dirname, './routes/*.yaml')
	]
};

// For debugging - log the path being used
console.log('Swagger docs path:', path.join(__dirname, './routes/*.yaml'));

const swaggerSpec = swaggerJsdoc(options);

// For debugging - log if any paths were found
console.log('Found paths:', Object.keys(swaggerSpec.paths || {}).length);

const setupSwagger = (app) => {
	// Debug middleware to log the spec
	app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
		explorer: true
		
		
	}));

	app.get('/api/docs.json', (req, res) => {
		res.setHeader('Content-Type', 'application/json');
		res.send(swaggerSpec);
	});
};

module.exports = setupSwagger;