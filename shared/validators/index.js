const Joi = require('joi');

// User validation schemas
const userSchemas = {
    register: Joi.object({
        username: Joi.string()
            .alphanum()
            .min(3)
            .max(20)
            .required()
            .messages({
                'string.alphanum': 'Username must contain only alphanumeric characters',
                'string.min': 'Username must be at least 3 characters long',
                'string.max': 'Username must be at most 20 characters long',
                'any.required': 'Username is required'
            }),
        email: Joi.string()
            .email()
            .required()
            .messages({
                'string.email': 'Please provide a valid email address',
                'any.required': 'Email is required'
            }),
        password: Joi.string()
            .min(6)
            .max(100)
            .required()
            .messages({
                'string.min': 'Password must be at least 6 characters long',
                'string.max': 'Password must be at most 100 characters long',
                'any.required': 'Password is required'
            })
    }),

    login: Joi.object({
        username: Joi.string().required(),
        password: Joi.string().required()
    }),

    updateProfile: Joi.object({
        email: Joi.string().email().optional(),
        isOnline: Joi.boolean().optional()
    })
};

// Game validation schemas
const gameSchemas = {
    createGame: Joi.object({
        whitePlayerId: Joi.string().uuid().required(),
        blackPlayerId: Joi.string().uuid().required(),
        timeControl: Joi.object({
            initialMs: Joi.number().integer().min(1000).required(),
            incrementMs: Joi.number().integer().min(0).required()
        }).required()
    }),

    makeMove: Joi.object({
        gameId: Joi.string().uuid().required(),
        playerId: Joi.string().uuid().required(),
        move: Joi.string().required()
    }),

    getGame: Joi.object({
        gameId: Joi.string().uuid().required()
    })
};

// Matchmaking validation schemas
const matchmakingSchemas = {
    joinQueue: Joi.object({
        userId: Joi.string().uuid().required(),
        timeControl: Joi.string().valid(
            'bullet', 'blitz', 'rapid', 'classical',
            'bullet_increment', 'blitz_increment', 'rapid_increment'
        ).required(),
        rating: Joi.number().integer().min(0).max(3000).required()
    }),

    leaveQueue: Joi.object({
        userId: Joi.string().uuid().required()
    }),

    getQueueStatus: Joi.object({
        userId: Joi.string().uuid().required()
    })
};

// Analysis validation schemas
const analysisSchemas = {
    analyzePosition: Joi.object({
        fen: Joi.string().required(),
        depth: Joi.number().integer().min(1).max(7).optional()
    }),

    analyzeGame: Joi.object({
        pgn: Joi.string().required()
    }),

    getOpeningBook: Joi.object({
        fen: Joi.string().required()
    })
};

// WebSocket message validation schemas
const websocketSchemas = {
    moveMessage: Joi.object({
        type: Joi.string().valid('move').required(),
        payload: Joi.object({
            move: Joi.string().required(),
            timestamp: Joi.number().integer().optional()
        }).required()
    }),

    chatMessage: Joi.object({
        type: Joi.string().valid('chat').required(),
        payload: Joi.object({
            message: Joi.string().min(1).max(500).required(),
            timestamp: Joi.number().integer().optional()
        }).required()
    }),

    drawOffer: Joi.object({
        type: Joi.string().valid('draw_offer').required(),
        payload: Joi.object({
            offerType: Joi.string().valid('offer', 'accept', 'decline').required(),
            timestamp: Joi.number().integer().optional()
        }).required()
    }),

    resignation: Joi.object({
        type: Joi.string().valid('resign').required(),
        payload: Joi.object({
            timestamp: Joi.number().integer().optional()
        }).required()
    })
};

// Utility validation functions
const validate = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({
                error: 'Validation error',
                details: error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message
                }))
            });
        }
        req.validatedData = value;
        next();
    };
};

const validateQuery = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.query);
        if (error) {
            return res.status(400).json({
                error: 'Validation error',
                details: error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message
                }))
            });
        }
        req.validatedQuery = value;
        next();
    };
};

const validateParams = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.params);
        if (error) {
            return res.status(400).json({
                error: 'Validation error',
                details: error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message
                }))
            });
        }
        req.validatedParams = value;
        next();
    };
};

// Custom validation functions
const isValidFEN = (fen) => {
    const fenRegex = /^([rnbqkpRNBQKP1-8]+\/){7}[rnbqkpRNBQKP1-8]+\s[wb]\s(-|[KQkq]+)\s(-|[a-h][36])\s\d+\s\d+$/;
    return fenRegex.test(fen);
};

const isValidMove = (move) => {
    // Basic move format validation
    const moveRegex = /^([a-h][1-8]){2}[qrbn]?$/;
    return moveRegex.test(move);
};

const isValidPGN = (pgn) => {
    // Basic PGN format validation
    const pgnRegex = /^(\[.*\]\s*)*\s*(\d+\.\s*[NBRQK]?[a-h]?[1-8]?x?[a-h][1-8](=[NBRQ])?[+#]?\s*)+$/;
    return pgnRegex.test(pgn.trim());
};

module.exports = {
    userSchemas,
    gameSchemas,
    matchmakingSchemas,
    analysisSchemas,
    websocketSchemas,
    validate,
    validateQuery,
    validateParams,
    isValidFEN,
    isValidMove,
    isValidPGN
};
