// Server Configuration
const SERVER_PORTS = {
    USER_SERVICE: 3001,
    GAME_LIFECYCLE_SERVICE: 3002,
    MATCHMAKING_SERVICE: 3003,
    AI_ANALYSIS_SERVICE: 3004,
    WEBSOCKET_GATEWAY_SERVICE: 8080
};

// Redis Configuration
const REDIS_KEYS = {
    GAME_PREFIX: 'game:',
    USER_PREFIX: 'user:',
    SESSION_PREFIX: 'session:',
    QUEUE_PREFIX: 'queue:',
    ANALYSIS_PREFIX: 'analysis:'
};

const REDIS_CHANNELS = {
    GAME_UPDATES: 'game-updates',
    GAME_ACTIONS: 'game-actions',
    USER_UPDATES: 'user-updates',
    SYSTEM_NOTIFICATIONS: 'system-notifications'
};

// Time Controls (in milliseconds)
const TIME_CONTROLS = {
    BULLET: { initialMs: 60000, incrementMs: 0 }, // 1 minute
    BLITZ: { initialMs: 300000, incrementMs: 0 }, // 5 minutes
    RAPID: { initialMs: 600000, incrementMs: 0 }, // 10 minutes
    CLASSICAL: { initialMs: 1800000, incrementMs: 0 }, // 30 minutes
    BULLET_INCREMENT: { initialMs: 120000, incrementMs: 1000 }, // 2+1
    BLITZ_INCREMENT: { initialMs: 300000, incrementMs: 2000 }, // 5+2
    RAPID_INCREMENT: { initialMs: 600000, incrementMs: 5000 }, // 10+5
    CLASSICAL_INCREMENT: { initialMs: 1800000, incrementMs: 10000 } // 30+10
};

// Matchmaking Configuration
const MATCHMAKING = {
    RATING_TOLERANCE: 200,
    MAX_WAIT_TIME: 30000, // 30 seconds
    QUEUE_CHECK_INTERVAL: 2000, // 2 seconds
    MAX_QUEUE_TIME: 60000 // 1 minute
};

// Rating System
const RATING = {
    DEFAULT_RATING: 1200,
    MIN_RATING: 0,
    MAX_RATING: 3000,
    RATING_CHANGE_K: 32, // K-factor for rating calculations
    PROVISIONAL_GAMES: 20 // Number of games before rating becomes established
};

// Game Configuration
const GAME = {
    MAX_MOVE_TIME: 300000, // 5 minutes per move
    DRAW_OFFER_TIMEOUT: 30000, // 30 seconds to respond to draw offer
    RESIGNATION_CONFIRMATION_TIME: 5000, // 5 seconds to confirm resignation
    MAX_GAME_DURATION: 7200000 // 2 hours maximum game duration
};

// WebSocket Configuration
const WEBSOCKET = {
    HEARTBEAT_INTERVAL: 30000, // 30 seconds
    CONNECTION_TIMEOUT: 60000, // 1 minute
    MAX_MESSAGE_SIZE: 1024 * 1024, // 1MB
    RECONNECT_ATTEMPTS: 5,
    RECONNECT_DELAY: 1000 // 1 second
};

// Analysis Configuration
const ANALYSIS = {
    DEFAULT_DEPTH: 3,
    MAX_DEPTH: 7,
    ANALYSIS_TIMEOUT: 10000, // 10 seconds
    CACHE_DURATION: 3600000 // 1 hour
};

// Security Configuration
const SECURITY = {
    JWT_EXPIRES_IN: '24h',
    BCRYPT_ROUNDS: 10,
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION: 900000, // 15 minutes
    SESSION_TIMEOUT: 86400000 // 24 hours
};

// File Upload Configuration
const UPLOAD = {
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_EXTENSIONS: ['.png', '.jpg', '.jpeg', '.gif'],
    UPLOAD_PATH: './uploads/'
};

// Error Codes
const ERROR_CODES = {
    // Authentication errors
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    UNAUTHORIZED: 'UNAUTHORIZED',
    
    // Game errors
    GAME_NOT_FOUND: 'GAME_NOT_FOUND',
    INVALID_MOVE: 'INVALID_MOVE',
    NOT_YOUR_TURN: 'NOT_YOUR_TURN',
    GAME_ALREADY_OVER: 'GAME_ALREADY_OVER',
    
    // Matchmaking errors
    ALREADY_IN_QUEUE: 'ALREADY_IN_QUEUE',
    QUEUE_FULL: 'QUEUE_FULL',
    INVALID_TIME_CONTROL: 'INVALID_TIME_CONTROL',
    
    // System errors
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED'
};

module.exports = {
    SERVER_PORTS,
    REDIS_KEYS,
    REDIS_CHANNELS,
    TIME_CONTROLS,
    MATCHMAKING,
    RATING,
    GAME,
    WEBSOCKET,
    ANALYSIS,
    SECURITY,
    UPLOAD,
    ERROR_CODES
};
