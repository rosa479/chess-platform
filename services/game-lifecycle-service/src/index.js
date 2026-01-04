require('dotenv').config();

const express = require('express');
const cors = require('cors');
const Redis = require('ioredis');
const { Chess } = require('chess.js');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

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
const PORT = process.env.PORT;

// Redis configuration from environment
// 1. Connect to Redis
const redisClient = new Redis({
  host: 'redis',
  port: 6379,
  family: 4
});
redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.on('connect', () => console.log('✅ Connected to Redis (game-lifecycle-service)'));

// 2. Mock Message Bus (RabbitMQ, Kafka, etc.)
const messageBus = {
    publish: (topic, payload) => {
        console.log(`[Message Bus] Publishing to '${topic}':`, JSON.stringify(payload, null, 2));
        // In a real system, this would send the message to RabbitMQ/Kafka.
    },
};

app.post('/games', async (req, res) => {
    try {
        const { whitePlayerId, blackPlayerId, timeControl } = req.body;
        if (!whitePlayerId || !blackPlayerId) {
            return res.status(400).json({ error: 'whitePlayerId and blackPlayerId are required' });
        }
        if (!timeControl || typeof timeControl.initialMs !== 'number') {
            return res.status(400).json({ error: 'timeControl with initialMs is required' });
        }
        // Prevent more than one active game per user
        const gameKeys = await redisClient.keys('game:*');
        for (const gameKey of gameKeys) {
            const stateRaw = await redisClient.get(gameKey);
            if (stateRaw) {
                const state = JSON.parse(stateRaw);
                if (state.whitePlayerId === whitePlayerId || state.blackPlayerId === whitePlayerId ||
                    state.whitePlayerId === blackPlayerId || state.blackPlayerId === blackPlayerId) {
                    return res.status(409).json({ error: 'User already in a game' });
                }
            }
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
        res.status(201).json({ gameId, initialState: gameState });
    } catch (error) {
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
            return await handleGameOver(gameState, chess, 'timeout', 'black'); // Black wins
        }
    } else {
        gameState.blackTimeLeftMs -= timeElapsed;
        if (gameState.blackTimeLeftMs <= 0) {
            return await handleGameOver(gameState, chess, 'timeout', 'white'); // White wins
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
    return await handleGameOver(gameState, chess, getTerminationReason(chess), getWinner(chess));
}

    // 7. Save the updated state back to Redis
    await redisClient.set(`game:${gameId}`, JSON.stringify(gameState));

    // 8. Return the new state to be broadcast
    return { success: true, newState: gameState };
}

async function handleGameOver(gameState, chess, reason, winner) {
    console.log(`[DEBUG] handleGameOver called for game: ${gameState.gameId}`);
    const eventPayload = {
        gameId: gameState.gameId,
        whitePlayerId: gameState.whitePlayerId,
        blackPlayerId: gameState.blackPlayerId,
        outcome: { winner, reason }, // winner: 'white', 'black', or 'draw'
        pgn: chess.pgn()
    };
    // Publish the event for other services (user-service, analysis-service)
    messageBus.publish('game.finished', eventPayload);

    // --- Update user stats ---
    const userServiceBase = process.env.USER_SERVICE_URL;
    const gameResultPath = (userId) => `${userServiceBase}/users/${userId}/game-result`;
    // Prepare results
    let whiteResult = 'loss';
    let blackResult = 'loss';
    if (winner === 'white') {
        whiteResult = 'win'; blackResult = 'loss';
    } else if (winner === 'black') {
        whiteResult = 'loss'; blackResult = 'win';
    } else if (winner === 'draw') {
        whiteResult = 'draw'; blackResult = 'draw';
    }
    // Update players
    let ratingChanges = { white: 0, black: 0 };

    try {
        console.log(`[DEBUG] Attempting to send rating update for game: ${gameState.gameId}`);
    const ratingResponse = await axios.post(
        `${RATING_SERVICE_URL}/ratings/update`,
        {
        gameId: gameState.gameId,
        whitePlayerId: gameState.whitePlayerId,
        blackPlayerId: gameState.blackPlayerId,
        result: winner, // 'white' | 'black' | 'draw'
        }
    );

    console.log(`[DEBUG] Rating update successful for game: ${gameState.gameId}`);
        ratingChanges = ratingResponse.data.ratingChanges;
    } catch (err) {
    console.error('[DEBUG] Failed to update ratings (Caught error in game-lifecycle):', err?.response?.data || err.message);
    }

    // --- Update user stats WITH rating changes ---
    try {
    await axios.post(gameResultPath(gameState.whitePlayerId), {
        result: whiteResult,
        ratingChange: ratingChanges.white,
    });
    } catch (err) {
    console.error('Failed to update white player stats:', err?.response?.data || err.message);
    }

    try {
    await axios.post(gameResultPath(gameState.blackPlayerId), {
        result: blackResult,
        ratingChange: ratingChanges.black,
    });
    } catch (err) {
    console.error('Failed to update black player stats:', err?.response?.data || err.message);
    }


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
