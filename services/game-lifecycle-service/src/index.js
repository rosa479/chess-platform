require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { createClient } = require('redis');
const { Chess } = require('chess.js');
const { v4: uuidv4 } = require('uuid');

const app = express();

// CORS configuration - allow all origins in development
const corsOptions = {
  origin: process.env.CORS_ORIGIN || true, // Allow all origins in development
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};
app.use(cors(corsOptions));

app.use(express.json());

// Log all incoming requests for debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'game-lifecycle-service' });
});

// Server configuration
const PORT = process.env.PORT || 3003;

// Redis configuration from environment
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const REDIS_URL = process.env.REDIS_URL || `redis://${REDIS_HOST}:${REDIS_PORT}`;

// 1. Connect to Redis
const redisClient = createClient({
    url: REDIS_URL,
});
redisClient.on('error', (err) => console.log('Redis Client Error', err));

// 2. Mock Message Bus (RabbitMQ, Kafka, etc.)
const messageBus = {
    publish: (topic, payload) => {
        console.log(`[Message Bus] Publishing to '${topic}':`, JSON.stringify(payload, null, 2));
        // In a real system, this would send the message to RabbitMQ/Kafka.
    },
};

app.post('/games', async (req, res) => {
    try {
        console.log('📥 POST /games - Request body:', JSON.stringify(req.body, null, 2));
        
        const { whitePlayerId, blackPlayerId, timeControl } = req.body;
        
        // Validate required fields
        if (!whitePlayerId || !blackPlayerId) {
            console.error('❌ Missing required fields: whitePlayerId or blackPlayerId');
            return res.status(400).json({ error: 'whitePlayerId and blackPlayerId are required' });
        }
        
        if (!timeControl || typeof timeControl.initialMs !== 'number') {
            console.error('❌ Invalid timeControl:', timeControl);
            return res.status(400).json({ error: 'timeControl with initialMs is required' });
        }
        
        const gameId = uuidv4();
        const chess = new Chess();

        const gameState = {
            gameId,
            whitePlayerId,
            blackPlayerId,
            fen: chess.fen(),
            whiteTimeLeftMs: timeControl.initialMs,
            blackTimeLeftMs: timeControl.initialMs,
            lastMoveTimestamp: Date.now(),
        };

        await redisClient.set(`game:${gameId}`, JSON.stringify(gameState));
        console.log(`✅ Game created: ${gameId} for ${whitePlayerId} vs ${blackPlayerId}`);
        res.status(201).json({ gameId, initialState: gameState });
    } catch (error) {
        console.error('❌ Error creating game:', error);
        res.status(500).json({ error: 'Failed to create game.', details: error.message });
    }
});

app.get('/games/:gameId', async (req, res) => {
    const { gameId } = req.params;
    
    try {
        const gameJSON = await redisClient.get(`game:${gameId}`);
        if (!gameJSON) {
            return res.status(404).json({ error: 'Game not found.' });
        }
        const gameState = JSON.parse(gameJSON);
        res.status(200).json(gameState);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/games/:gameId/move', async (req, res) => {
    const { gameId } = req.params;
    const { playerId, move } = req.body; // move: e.g., { from: 'e2', to: 'e4' }

    try {
        const result = await handlePlayerMove(gameId, playerId, move);
        if (result.error) {
            return res.status(400).json(result);
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


async function handlePlayerMove(gameId, playerId, move) {
    // 1. Fetch current game state from Redis
    const gameJSON = await redisClient.get(`game:${gameId}`);
    if (!gameJSON) {
        return { error: "Game not found." };
    }
    const gameState = JSON.parse(gameJSON);

    // 2. Load game into chess.js and validate the turn
    const chess = new Chess(gameState.fen);
    const turn = chess.turn(); // 'w' or 'b'
    if ((turn === 'w' && playerId !== gameState.whitePlayerId) ||
        (turn === 'b' && playerId !== gameState.blackPlayerId)) {
        return { error: "Not your turn." };
    }

    // 3. Calculate time used and update the player's clock
    const timeNow = Date.now();
    const timeElapsed = timeNow - gameState.lastMoveTimestamp;

    if (turn === 'w') {
        gameState.whiteTimeLeftMs -= timeElapsed;
        if (gameState.whiteTimeLeftMs <= 0) {
            return handleGameOver(gameState, chess, 'timeout', 'black'); // Black wins
        }
    } else {
        gameState.blackTimeLeftMs -= timeElapsed;
        if (gameState.blackTimeLeftMs <= 0) {
            return handleGameOver(gameState, chess, 'timeout', 'white'); // White wins
        }
    }

    // 4. Attempt to make the move
    const result = chess.move(move);
    if (result === null) {
        return { error: "Illegal move." };
    }

    // 5. Update game state with the new position
    gameState.fen = chess.fen();
    gameState.lastMoveTimestamp = timeNow;

    // 6. Check for game termination (checkmate, stalemate, etc.)
    if (chess.isGameOver()) {
        return handleGameOver(gameState, chess, getTerminationReason(chess), getWinner(chess));
    }

    // 7. Save the updated state back to Redis
    await redisClient.set(`game:${gameId}`, JSON.stringify(gameState));

    // 8. Return the new state to be broadcast
    return { success: true, newState: gameState };
}

function handleGameOver(gameState, chess, reason, winner) {
    const eventPayload = {
        gameId: gameState.gameId,
        whitePlayerId: gameState.whitePlayerId,
        blackPlayerId: gameState.blackPlayerId,
        outcome: { winner, reason }, // winner: 'white', 'black', or 'draw'
        pgn: chess.pgn()
    };

    // Publish the event for other services (user-service, analysis-service)
    messageBus.publish('game.finished', eventPayload);

    // Clean up the active game state from Redis
    redisClient.del(`game:${gameState.gameId}`);

    console.log(`[Game Over] Game ${gameState.gameId} finished. Winner: ${winner}, Reason: ${reason}`);
    return { success: true, gameOver: true, outcome: eventPayload.outcome };
}

function getTerminationReason(chess) {
    if (chess.isCheckmate()) return 'checkmate';
    if (chess.isStalemate()) return 'stalemate';
    if (chess.isThreefoldRepetition()) return 'repetition';
    if (chess.isInsufficientMaterial()) return 'insufficient material';
    if (chess.isDraw()) return 'draw by 50-move rule';
    return 'unknown';
}

function getWinner(chess) {
    if (!chess.isGameOver()) return null;
    if (chess.isCheckmate()) {
        // If it's white's turn but the game is over by checkmate, black delivered the mate.
        return chess.turn() === 'w' ? 'black' : 'white';
    }
    // All other game-over scenarios are draws
    return 'draw';
}

// 404 handler - must be after all routes
app.use((req, res) => {
  console.log(`404: ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Route not found', path: req.path });
});

async function startServer() {
    try {
        await redisClient.connect();
        console.log('✅ Connected to Redis (game-lifecycle-service)');
    } catch (error) {
        console.error('❌ Failed to connect to Redis:', error);
        process.exit(1);
    }
    
    app.listen(PORT, () => {
        console.log(`♟️ Game Lifecycle Service running on port ${PORT}`);
        console.log(`Available routes:`);
        console.log(`  GET  /health`);
        console.log(`  POST /games`);
        console.log(`  GET  /games/:gameId`);
        console.log(`  POST /games/:gameId/move`);
    });
}

startServer().catch(error => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
});
