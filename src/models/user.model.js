const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const {
	ROLES,
	STATUS
} = require('../utils/constants');

const userSchema = new mongoose.Schema({
	email: {
		type: String,
		required: true,
		unique: true,
		lowercase: true,
		trim: true,
		maxlength: 100
	},
	username: {
		type: String,
		required: true,
		unique: true,
		trim: true,
		minlength: 3,
		maxlength: 20,
	},
	password: {
		type: String,
		required: true,
		minlength: 8,
		select: false // Exclude password from query results by default for security
	},
    dateOfBirth: {
        type: Date,
        required: true
    },
	role: {
		type: String,
		enum: Object.values(ROLES),
		default: ROLES.USER
	},
	status: {
		type: String,
		enum: Object.values(STATUS),
		default: STATUS.ACTIVE
	},
	lastLogin: {
		type: Date,
		default: null
	},
	failedLoginAttempts: {
		type: Number,
		default: 0
	},
	lockUntil: {
		type: Date,
		default: null
	},
	resetPasswordToken: {
		type: String,
		default: null,
		select: false // Hide reset token from query results for security
	},
	resetPasswordExpires: {
		type: Date,
		default: null,
		select: false
	}
}, {
	timestamps: true,
	toJSON: {
		transform: (doc, ret) => {
			// Remove sensitive fields when converting to JSON
			delete ret.password;
			delete ret.failedLoginAttempts;
			delete ret.lockUntil;
			return ret;
		}
	}
});

// Indexes for faster lookups on frequently queried fields
userSchema.index({
	email: 1
}, {
	unique: true
});
userSchema.index({
	username: 1
}, {
	unique: true
});

// Hash password before saving to ensure passwords are never stored in plaintext
userSchema.pre('save', async function(next) {
	if (!this.isModified('password')) {
		return next();
	}

	// Salt factor of 12 provides good balance between security and performance
	const salt = await bcrypt.genSalt(12);
	this.password = await bcrypt.hash(this.password, salt);
	next();
});

// Instance methods
userSchema.methods = {
	comparePassword(candidatePassword) {
		return bcrypt.compare(candidatePassword, this.password);
	},

	isLocked() {
		return this.lockUntil && this.lockUntil > Date.now();
	},

	async handleFailedLogin() {
		this.failedLoginAttempts += 1;

		// Lock account after 15 failed attempts to prevent brute force attacks
		if (this.failedLoginAttempts >= 15) {
			this.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes lockout
			this.status = STATUS.BLOCKED;
		}

		return this.save();
	},

	async handleSuccessfulLogin() {
		this.failedLoginAttempts = 0;
		this.lockUntil = null;
		this.lastLogin = new Date();
		this.status = STATUS.ACTIVE;
		return this.save();
	}
};

userSchema.statics = {
	findByEmail(email) {
		return this.findOne({
			email: email.toLowerCase(),
			status: STATUS.ACTIVE
		});
	}
};

userSchema.methods.generateResetToken = async function() {
	// Generate a random token with high entropy for security
	const resetToken = crypto.randomBytes(32).toString('hex');

	// Hash token before storing to prevent token leakage if database is compromised
	const hashedToken = crypto
		.createHash('sha256')
		.update(resetToken)
		.digest('hex');

	// Save hashed token and expiry
	this.resetPasswordToken = hashedToken;
	this.resetPasswordExpires = Date.now() + 3600000; // 1 hour expiry for security
	await this.save();

	// Return unhashed token - only sent to user via email
	return resetToken;
};

userSchema.methods.verifyResetToken = function(token) {
	// Hash provided token to compare with stored hash
	const hashedToken = crypto
		.createHash('sha256')
		.update(token)
		.digest('hex');

	return (
		this.resetPasswordToken === hashedToken &&
		this.resetPasswordExpires > Date.now()
	);
};

const User = mongoose.model('User', userSchema);

module.exports = User;