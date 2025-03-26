const Novel = require('../models/novel.model');
const { AuthorizationError } = require('../utils/errors');
const { NOVEL_ERRORS } = require('../utils/constants');

const isNovelAuthor = async(req, res, next) => {
    try {
        const novelId = req.params.id || req.params.novelId;

        if (!novelId) {
            return next(new AuthorizationError(NOVEL_ERRORS.NOVEL_ID_REQUIRED));
        }

        const novel = await Novel.findById(novelId);

        if(!novel) {
            return next(new AuthorizationError(NOVEL_ERRORS.NOVEL_NOT_FOUND));
        }

        if(novel.author.toString() !== req.user.id) {
            return next(new AuthorizationError(NOVEL_ERRORS.NOVEL_ACCESS_DENIED));
        }

        req.novel = novel;
        next();
    } catch (error) {
        next(error);
    }
}

module.exports = {
    isNovelAuthor
};