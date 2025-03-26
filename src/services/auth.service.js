const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { ERROR_MESSAGES } = require('../utils/constants'); 
const {
	AuthenticationError,
	ValidationError,
	ConflictError
} = require('../utils/errors');
const crypto = require('crypto');


const AuthService = {
	generateToken(user, type = 'access') {
		return jwt.sign({
				userId: user._id,
				email: user.email,
				role: user.role,
				type: type  // Include token type in payload to distinguish between access and refresh tokens
			},
			process.env.JWT_SECRET, {
				expiresIn: type === 'access' ?
					process.env.JWT_ACCESS_EXPIRATION : process.env.JWT_REFRESH_EXPIRATION
			}
		);
	},

	generateAuthTokens(user) {
		const accessToken = this.generateToken(user, 'access');
		const refreshToken = this.generateToken(user, 'refresh');

		return {
			accessToken,
			refreshToken
		};
	},

	async getCurrentUser(userId) {
		const user = await User.findById(userId).select('-password');

		if (!user) {
			throw new AuthenticationError(ERROR_MESSAGES.USER_NOT_FOUND);
		}

		return user;
	},

	async refreshToken(refreshToken) {
		try {
			const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

			// Verify this is a refresh token - prevents access tokens from being used as refresh tokens
			if (decoded.type !== 'refresh') {
				throw new AuthenticationError(ERROR_MESSAGES.INVALID_TOKEN_TYPE);
			}

			const user = await User.findById(decoded.userId);

			if (!user || user.status !== 'active') {
				throw new AuthenticationError(ERROR_MESSAGES.INVALID_REFRESH_TOKEN);
			}

			// Generate new access token only, keeping the same refresh token
			const accessToken = this.generateToken(user, 'access');

			return {
				accessToken,
				user: {
					id: user._id,
					email: user.email,
					username: user.username,
					role: user.role
				}
			};
		} catch (error) {
			if (error.name === 'TokenExpiredError') {
				throw new AuthenticationError(ERROR_MESSAGES.REFRESH_TOKEN_EXPIRED);
			}
			throw new AuthenticationError(ERROR_MESSAGES.INVALID_TOKEN_TYPE);
		}
	},

	async logout(userId) {
		const user = await User.findById(userId);

		if (!user) {
			throw new AuthenticationError(ERROR_MESSAGES.USER_NOT_FOUND);
		}

		user.lastLogin = null;
		await user.save();

		return true;
	},

	async register(userData) {
		const existingUser = await User.findOne({
			$or: [{
					email: userData.email.toLowerCase()
				},
				{
					username: userData.username
				}
			]
		});

		if (existingUser) {
			throw new ConflictError(ERROR_MESSAGES.USER_EXISTS);
		}

		const user = await User.create({
			email: userData.email,
			username: userData.username,
			password: userData.password,
			dateOfBirth: new Date(userData.dateOfBirth)
		});

		// Return minimal user information to avoid sensitive data exposure
		return {
			id: user._id,
			email: user.email,
			username: user.username,
			dateOfBirth: user.dateOfBirth,
			createdAt: user.createdAt
		};
	},

	async login(email, password) {
		const user = await User.findOne({
			email: email.toLowerCase()
		}).select('+password');  // Explicitly include password field which is excluded by default

		if (!user) {
			throw new AuthenticationError(ERROR_MESSAGES.INVALID_CREDENTIALS);
		}

		if (user.isLocked()) {
			throw new AuthenticationError(ERROR_MESSAGES.ACCOUNT_LOCKED);
		}

		const isValidPassword = await user.comparePassword(password);

		if (!isValidPassword) {
			// Track failed attempts to implement progressive security measures
			await user.handleFailedLogin();
			throw new AuthenticationError(ERROR_MESSAGES.INVALID_CREDENTIALS);
		}

		await user.handleSuccessfulLogin();

		const tokens = this.generateAuthTokens(user);

		// Return minimal user data with tokens to prevent sensitive data exposure
		return {
			tokens,
			user: {
				id: user._id,
				email: user.email,
				username: user.username,
				role: user.role
			}
		};
	},
	async requestPasswordReset(email) {
		const user = await User.findOne({
			email: email.toLowerCase()
		});
		if (!user) {
			// Return success even if user not found for security (prevent user enumeration)
			return true;
		}

		const resetToken = await user.generateResetToken();

		// TODO: Send email with reset token
		// For development, return token
		return resetToken;
	},

	async resetPassword(token, newPassword) {
		const user = await User.findOne({
			resetPasswordToken: crypto
				.createHash('sha256')
				.update(token)
				.digest('hex'),
			resetPasswordExpires: {
				$gt: Date.now()  // Ensure token hasn't expired for security
			}
		});

		if (!user) {
			throw new AuthenticationError(ERROR_MESSAGES.INVALID_RESET_TOKEN);
		}

		// Update password and clear reset token to prevent token reuse
		user.password = newPassword;
		user.resetPasswordToken = null;
		user.resetPasswordExpires = null;
		await user.save();

		return true;
	}
};

module.exports = AuthService;