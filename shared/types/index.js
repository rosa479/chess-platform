// Game Types
const GameStatus = {
    WAITING: 'waiting',
    ACTIVE: 'active',
    PAUSED: 'paused',
    FINISHED: 'finished',
    ABANDONED: 'abandoned'
};

const GameResult = {
    WHITE_WINS: 'white',
    BLACK_WINS: 'black',
    DRAW: 'draw',
    IN_PROGRESS: 'in_progress'
};

const TerminationReason = {
    CHECKMATE: 'checkmate',
    STALEMATE: 'stalemate',
    TIMEOUT: 'timeout',
    RESIGNATION: 'resignation',
    DRAW_AGREEMENT: 'draw_agreement',
    INSUFFICIENT_MATERIAL: 'insufficient_material',
    THREEFOLD_REPETITION: 'threefold_repetition',
    FIFTY_MOVE_RULE: 'fifty_move_rule'
};

// Time Control Types
const TimeControl = {
    BULLET: 'bullet',
    BLITZ: 'blitz',
    RAPID: 'rapid',
    CLASSICAL: 'classical',
    BULLET_INCREMENT: 'bullet_increment',
    BLITZ_INCREMENT: 'blitz_increment',
    RAPID_INCREMENT: 'rapid_increment'
};

// User Types
const UserStatus = {
    ONLINE: 'online',
    OFFLINE: 'offline',
    IN_GAME: 'in_game',
    IN_QUEUE: 'in_queue'
};

// WebSocket Message Types
const MessageType = {
    // Game messages
    GAME_STATE_UPDATE: 'game_state_update',
    MOVE_MADE: 'move_made',
    GAME_OVER: 'game_over',
    TIME_UPDATE: 'time_update',
    
    // Chat messages
    CHAT_MESSAGE: 'chat_message',
    SYSTEM_MESSAGE: 'system_message',
    
    // Matchmaking messages
    MATCH_FOUND: 'match_found',
    QUEUE_UPDATE: 'queue_update',
    
    // Error messages
    ERROR: 'error',
    INVALID_MOVE: 'invalid_move',
    NOT_YOUR_TURN: 'not_your_turn',
    
    // Connection messages
    CONNECTION_ESTABLISHED: 'connection_established',
    PLAYER_CONNECTED: 'player_connected',
    PLAYER_DISCONNECTED: 'player_disconnected'
};

// Move Types
const MoveType = {
    NORMAL: 'normal',
    CASTLE_KINGSIDE: 'castle_kingside',
    CASTLE_QUEENSIDE: 'castle_queenside',
    EN_PASSANT: 'en_passant',
    PROMOTION: 'promotion',
    CAPTURE: 'capture'
};

// Analysis Types
const AnalysisDepth = {
    QUICK: 1,
    STANDARD: 3,
    DEEP: 5,
    EXPERT: 7
};

module.exports = {
    GameStatus,
    GameResult,
    TerminationReason,
    TimeControl,
    UserStatus,
    MessageType,
    MoveType,
    AnalysisDepth
};
