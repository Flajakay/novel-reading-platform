exports.UPLOAD_LIMITS = {
	COVER_SIZE: 5 * 1024 * 1024,
	COVER_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
	CHAPTER_SIZE: 10 * 1024 * 1024
};

exports.RATE_LIMITS = {
	LOGIN: {
		windowMs: 15 * 60 * 1000,
		max: 5
	},
	API: {
		windowMs: 15 * 60 * 1000,
		max: 1000
	}
};

exports.TIMEOUTS = {
	CONNECT: 10000,
	SOCKET: 45000,
	SERVER_SELECTION: 5000,
	HEARTBEAT: 10000,
	GRACEFUL_SHUTDOWN: 30000,
};

exports.DB_CONFIG = {
	MAX_POOL_SIZE: 25,
	MAX_RETRIES: 5,
	RETRY_INTERVAL: 8000,

};

exports.FILE_SIZES = {
	JSON_LIMIT: '5mb',
	URLENCODED_LIMIT: '5mb',
};

exports.CACHE_KEYS = {
	NOVEL_LIST: 'novel_list',
	POPULAR_NOVELS: 'popular_novels',
	USER_LIBRARY: 'user_library_'
};

exports.LOG_LEVELS = {
	ERROR: 'error',
	WARN: 'warn',
	INFO: 'info',
	DEBUG: 'debug'
};

exports.NOVEL_CONFIG = {
    PAGINATION: {
        DEFAULT_PAGE: 1,
        DEFAULT_LIMIT: 20,
        MAX_LIMIT: 100
    },
    CONTENT_LIMITS: {
        TITLE_MAX_LENGTH: 200,
        CONTENT_MIN_LENGTH: 100,
        CONTENT_MAX_LENGTH: 50000,
        DESCRIPTION_MAX_LENGTH: 1000,
        GENRE_MAX_LENGTH: 20,
        TAG_MAX_LENGTH: 20,
        MAX_GENRES: 5,
        MAX_TAGS: 10
    },
    READING: {
        WORDS_PER_MINUTE: 200,
        TRENDING_DAYS_MIN: 1,
        TRENDING_DAYS_MAX: 30,
        TRENDING_DEFAULT_DAYS: 7
    }	
};