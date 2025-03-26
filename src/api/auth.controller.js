const express = require('express');
const AuthService = require('../services/auth.service');

const {
	HTTP_STATUS,
	API_MESSAGES,
	API_STATUS
} = require('../utils/constants');
const {
	validateRegistration,
	validateLogin,
	validateRefreshToken,
	handleValidationErrors,
	validatePasswordResetRequest,
	validatePasswordReset
} = require('../middleware/auth.validation');
const {
	authJWT
} = require('../middleware/authJWT');

const router = express.Router();

// Register
router.post('/register', validateRegistration, handleValidationErrors, async (req, res, next) => {
	try {
		const user = await AuthService.register(req.body);
		res.status(HTTP_STATUS.CREATED).json({
			status: API_STATUS.SUCCESS,
			data: user
		});
	} catch (error) {
		next(error);
	}
});

// Login
router.post('/login', validateLogin, handleValidationErrors, async (req, res, next) => {
	try {
		const {
			email,
			password
		} = req.body;
		const result = await AuthService.login(email, password);
		res.status(HTTP_STATUS.OK).json({
			status: API_STATUS.SUCCESS,
			data: {
				user: result.user,
				accessToken: result.tokens.accessToken,
				refreshToken: result.tokens.refreshToken
			}
		});
	} catch (error) {
		next(error);
	}
});

// Get current user
router.get('/me', authJWT, async (req, res, next) => {
	try {
		const user = await AuthService.getCurrentUser(req.user.id);
		res.status(HTTP_STATUS.OK).json({
			status: API_STATUS.SUCCESS,
			data: user
		});
	} catch (error) {
		next(error);
	}
});

// Refresh token
router.post('/refresh', validateRefreshToken, handleValidationErrors, async (req, res, next) => {
	try {
		const result = await AuthService.refreshToken(req.body.refreshToken);
		res.status(HTTP_STATUS.OK).json({
			status: API_STATUS.SUCCESS,
			data: {
				accessToken: result.accessToken,
				user: result.user
			}
		});
	} catch (error) {
		next(error);
	}
});

// Logout
router.post('/logout', authJWT, async (req, res, next) => {
	try {
		await AuthService.logout(req.user.id);
		res.status(HTTP_STATUS.NO_CONTENT).send();
	} catch (error) {
		next(error);
	}
});

// Password reset request
router.post('/reset-password-request',
	validatePasswordResetRequest,
	handleValidationErrors,
	async (req, res, next) => {
		try {
			const resetToken = await AuthService.requestPasswordReset(req.body.email);
			
			// Return a success response even if email doesn't exist
			// This prevents user enumeration attacks by not revealing whether an email exists
			res.status(HTTP_STATUS.OK).json({
				status: API_STATUS.SUCCESS,
				message: API_MESSAGES.RESET_LINK_SENT,
				// Include token only in development environment for testing purposes
				// In production, this would be sent via email instead
				...(process.env.NODE_ENV === 'development' && {
					resetToken
				})
			});
		} catch (error) {
			next(error);
		}
	}
);

// Reset password
router.post('/reset-password',
	validatePasswordReset,
	handleValidationErrors,
	async (req, res, next) => {
		try {
			await AuthService.resetPassword(req.body.token, req.body.newPassword);
			res.status(HTTP_STATUS.OK).json({
				status: API_STATUS.SUCCESS,
				message: API_MESSAGES.PASSWORD_RESET_SUCCESS
			});
		} catch (error) {
			next(error);
		}
	}
);

module.exports = router;