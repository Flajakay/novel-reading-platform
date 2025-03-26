// Middleware for handling file uploads
const multer = require('multer');
const { ValidationError } = require('../utils/errors');
const { UPLOAD_LIMITS } = require('../utils/constants');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    if (!UPLOAD_LIMITS.COVER_TYPES.includes(file.mimetype)) {
        return cb(
            new ValidationError(`Invalid file type. Allowed types: ${UPLOAD_LIMITS.COVER_TYPES.join(', ')}`)
        );
    }
    cb(null, true);
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: UPLOAD_LIMITS.COVER_SIZE
    },
    fileFilter: fileFilter
});

const uploadNovelCover = upload.single('cover');

// Error handling wrapper for multer
const handleUpload = (req, res, next) => {
    uploadNovelCover(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return next(
                    new ValidationError(
                        `File size exceeds the limit of ${UPLOAD_LIMITS.COVER_SIZE / (1024 * 1024)} MB`
                    )
                );
            }
            return next(new ValidationError(err.message));
        } else if (err) {
            return next(err);
        }
        next();
    });
};

module.exports = {
    handleUpload
};