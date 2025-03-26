const express = require('express');
const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
	res.json({
		status: 'ok',
		timestamp: new Date().toISOString(),
		uptime: process.uptime()
	});
});

// Test endpoint - GET /api/test
router.get('/test', (req, res) => {
	res.json({
		message: 'API is working!',
		timestamp: new Date().toISOString()
	});
});

// Test endpoint with parameters - GET /api/hello/:name
router.get('/hello/:name', (req, res) => {
	res.json({
		message: `Hello, ${req.params.name}!`,
		timestamp: new Date().toISOString()
	});
});

// Test POST endpoint - POST /api/echo
router.post('/echo', (req, res) => {
	res.json({
		message: 'Received POST request',
		body: req.body,
		timestamp: new Date().toISOString()
	});
});

// Import routes
const authRoutes = require('./auth.controller');

// Mount routes
router.use('/auth', authRoutes);


// Import routes
const novelRoutes = require('./novel.controller');

// Mount routes
router.use('/novels', novelRoutes);

const libraryRoutes = require('./library.controller');
router.use('/library', libraryRoutes); 

module.exports = router;

