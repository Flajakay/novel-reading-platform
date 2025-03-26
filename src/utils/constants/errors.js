exports.HTTP_STATUS = {
	OK: 200,
	CREATED: 201,
	NO_CONTENT: 204,
	BAD_REQUEST: 400,
	UNAUTHORIZED: 401,
	FORBIDDEN: 403,
	NOT_FOUND: 404,
	CONFLICT: 409,
	TOO_MANY_REQUESTS: 429,
	INTERNAL_SERVER_ERROR: 500,
	SERVICE_UNAVAILABLE: 503
};

exports.AUTH_ERRORS = {
    UNAUTHORIZED: 'Authentication failed',
    MISSING_TOKEN: 'No authentication token provided',
    INVALID_TOKEN_TYPE: 'Invalid token type', 
	INVALID_TOKEN: 'Invalid token',
    INVALID_REFRESH_TOKEN: 'Invalid refresh token',
    INVALID_RESET_TOKEN: 'Invalid reset token',
    REFRESH_TOKEN_EXPIRED: 'Refresh token expired',
    ACCESS_TOKEN_EXPIRED: 'Access token expired',
    INVALID_CREDENTIALS: 'Invalid email or password',
    ACCOUNT_BLOCKED: 'Account is blocked',
    ACCOUNT_LOCKED: 'Account is temporarily locked',
    INVALID_EMAIL_FORMAT: 'Invalid email format',
    EMAIL_TOO_LONG: 'Email must not exceed 100 characters',
    USERNAME_LENGTH: 'Username must be between 3 and 20 characters',
    USERNAME_FORMAT: 'Username can only contain letters, numbers, underscores and hyphens',
    DOB_REQUIRED: 'Date of birth is required',
    INVALID_DATE_FORMAT: 'Invalid date format. Please use YYYY-MM-DD',
    FUTURE_DATE: 'Date of birth cannot be in the future',
    MIN_AGE_REQUIRED: 'You must be at least 13 years old to register',
    INVALID_DOB: 'Please enter a valid date of birth',
    PASSWORD_LENGTH: 'Password must be at least 8 characters long',
    PASSWORD_REQUIREMENTS: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
    PASSWORD_REQUIRED: 'Password is required',
    REFRESH_TOKEN_REQUIRED: 'Refresh token is required',
    RESET_TOKEN_REQUIRED: 'Reset token is required'
};

exports.USER_ERRORS = {
	USER_NOT_FOUND: 'User not found',
	USER_EXISTS: 'User already exists',
	EMAIL_USERNAME_EXISTS: 'Email or username already exists',
	INVALID_ROLE: 'Invalid user role'
};

exports.SYSTEM_ERRORS = {
	SERVER_ERROR: 'Internal server error',
	VALIDATION_ERROR: 'Validation failed',
	DATABASE_ERROR: 'Database operation failed',
	FILE_UPLOAD_ERROR: 'File upload failed',
	TIMEOUT: 'Request timeout exceeded',
	TOO_MANY_REQUESTS: 'Too many requests from this IP, please try again later.',
	CORS_ERROR: 'Not allowed by CORS'
};

exports.NOVEL_ERRORS = {
    NOVEL_NOT_FOUND: 'Novel not found',
    CHAPTER_NOT_FOUND: 'Chapter not found',
    CHAPTER_EXISTS: 'Chapter number already exists',
    NO_CHAPTERS_FOUND: 'No chapters found',
    NO_ANALYTICS_FOUND: 'No analytics data found',
    INVALID_SEARCH_PARAMS: 'Invalid search parameters',
    NOVEL_ID_REQUIRED: 'novelId is required',	
	NOVEL_ACCESS_DENIED: 'You are not authorized to modify this novel'
};