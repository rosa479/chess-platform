require('dotenv').config();
const express = require('express');
const { createClient } = require('redis');
const { v4: uuidv4 } = require('uuid');
const { Chess } = require('chess.js');

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3006;

// Redis client
const redisClient = createClient({ url: process.env.REDIS_URL });
redisClient.on('error', (err) => console.log('Redis Client Error', err));

// Connect to Redis
(async () => {
    try {
        await redisClient.connect();
        console.log('Connected to Redis for computer opponent service');
    } catch (err) {
        console.error('Failed to connect to Redis:', err);
        process.exit(1);
    }
})();

// Computer difficulty levels
const DIFFICULTY_LEVELS = {
    BEGINNER: { rating: 800, depth: 1, name: 'Beginner' },
    INTERMEDIATE: { rating: 1200, depth: 2, name: 'Intermediate' },
    ADVANCED: { rating: 1600, depth: 3, name: 'Advanced' },
    EXPERT: { rating: 2000, depth: 4, name: 'Expert' },
    MASTER: { rating: 2400, depth: 5, name: 'Master' }
};

// Create game against computer
app.post('/computer-games', async (req, res) => {
    try {
        const { userId, difficulty, timeControl, playerColor } = req.body;

        if (!userId || !difficulty || !timeControl) {
            return res.status(400).json({ error: 'User ID, difficulty, and time control are required' });
        }

        if (!Object.keys(DIFFICULTY_LEVELS).includes(difficulty)) {
            return res.status(400).json({ error: 'Invalid difficulty level' });
        }

        const gameId = uuidv4();
        const computerLevel = DIFFICULTY_LEVELS[difficulty];
        
        // Determine colors
        const isPlayerWhite = playerColor === 'white' || (playerColor === 'random' && Math.random() > 0.5);
        const whitePlayerId = isPlayerWhite ? userId : 'computer';
        const blackPlayerId = isPlayerWhite ? 'computer' : userId;

        const gameState = {
            gameId,
            whitePlayerId,
            blackPlayerId,
            playerId: userId,
            computerId: 'computer',
            computerLevel,
            difficulty,
            fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
            whiteTimeLeftMs: timeControl.initialMs,
            blackTimeLeftMs: timeControl.initialMs,
            lastMoveTimestamp: Date.now(),
            isComputerGame: true,
            playerColor: isPlayerWhite ? 'white' : 'black',
            computerColor: isPlayerWhite ? 'black' : 'white'
        };

        await redisClient.set(`computer-game:${gameId}`, JSON.stringify(gameState));

        res.status(201).json({ 
            gameId, 
            gameState,
            message: `Playing against ${computerLevel.name} (${computerLevel.rating} rating)`
        });
    } catch (error) {
        console.error('Create computer game error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Make move against computer
app.post('/computer-games/:gameId/move', async (req, res) => {
    try {
        const { gameId } = req.params;
        const { move, playerId } = req.body;

        if (!move || !playerId) {
            return res.status(400).json({ error: 'Move and player ID are required' });
        }

        const gameData = await redisClient.get(`computer-game:${gameId}`);
        if (!gameData) {
            return res.status(404).json({ error: 'Game not found' });
        }

        const gameState = JSON.parse(gameData);
        const chess = new Chess(gameState.fen);

        // Validate move
        const moveResult = chess.move(move);
        if (!moveResult) {
            return res.status(400).json({ error: 'Invalid move' });
        }

        // Update game state
        gameState.fen = chess.fen();
        gameState.lastMoveTimestamp = Date.now();

        // Check if game is over
        if (chess.isGameOver()) {
            const result = handleGameOver(gameState, chess);
            await redisClient.del(`computer-game:${gameId}`);
            return res.json(result);
        }

        // Save updated state
        await redisClient.set(`computer-game:${gameId}`, JSON.stringify(gameState));

        // If it's computer's turn, make computer move
        if ((chess.turn() === 'w' && gameState.whitePlayerId === 'computer') ||
            (chess.turn() === 'b' && gameState.blackPlayerId === 'computer')) {
            
            setTimeout(async () => {
                await makeComputerMove(gameId);
            }, 1000); // 1 second delay for computer move
        }

        res.json({ 
            success: true, 
            newState: gameState,
            move: moveResult
        });
    } catch (error) {
        console.error('Make move error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get computer game state
app.get('/computer-games/:gameId', async (req, res) => {
    try {
        const { gameId } = req.params;

        const gameData = await redisClient.get(`computer-game:${gameId}`);
        if (!gameData) {
            return res.status(404).json({ error: 'Game not found' });
        }

        const gameState = JSON.parse(gameData);
        res.json(gameState);
    } catch (error) {
        console.error('Get computer game error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get available difficulty levels
app.get('/difficulty-levels', (req, res) => {
    res.json(DIFFICULTY_LEVELS);
});

// Make computer move
async function makeComputerMove(gameId) {
    try {
        const gameData = await redisClient.get(`computer-game:${gameId}`);
        if (!gameData) return;

        const gameState = JSON.parse(gameData);
        const chess = new Chess(gameState.fen);
        const computerLevel = gameState.computerLevel;

        // Get best move using minimax
        const bestMove = getBestMove(chess, computerLevel.depth);
        
        if (bestMove) {
            const moveResult = chess.move(bestMove);
            gameState.fen = chess.fen();
            gameState.lastMoveTimestamp = Date.now();

            // Check if game is over
            if (chess.isGameOver()) {
                const result = handleGameOver(gameState, chess);
                await redisClient.del(`computer-game:${gameId}`);
                
                // Notify player of game over (this would be handled by WebSocket in real implementation)
                console.log('Computer game over:', result);
                return;
            }

            await redisClient.set(`computer-game:${gameId}`, JSON.stringify(gameState));
            
            // Notify player of computer move (this would be handled by WebSocket)
            console.log(`Computer played: ${moveResult.san}`);
        }
    } catch (error) {
        console.error('Computer move error:', error);
    }
}

// Get best move using minimax algorithm
function getBestMove(chess, depth) {
    const moves = chess.moves({ verbose: true });
    if (moves.length === 0) return null;

    let bestMove = null;
    let bestScore = chess.turn() === 'w' ? -Infinity : Infinity;

    for (const move of moves) {
        chess.move(move);
        const score = minimax(chess, depth - 1, -Infinity, Infinity, chess.turn() === 'b');
        chess.undo();

        if ((chess.turn() === 'w' && score > bestScore) || 
            (chess.turn() === 'b' && score < bestScore)) {
            bestScore = score;
            bestMove = move;
        }
    }

    return bestMove;
}

// Minimax algorithm with alpha-beta pruning
function minimax(chess, depth, alpha, beta, isMaximizing) {
    if (depth === 0 || chess.isGameOver()) {
        return evaluatePosition(chess);
    }

    const moves = chess.moves({ verbose: true });

    if (isMaximizing) {
        let maxScore = -Infinity;
        for (const move of moves) {
            chess.move(move);
            const score = minimax(chess, depth - 1, alpha, beta, false);
            chess.undo();
            maxScore = Math.max(maxScore, score);
            alpha = Math.max(alpha, score);
            if (beta <= alpha) break;
        }
        return maxScore;
    } else {
        let minScore = Infinity;
        for (const move of moves) {
            chess.move(move);
            const score = minimax(chess, depth - 1, alpha, beta, true);
            chess.undo();
            minScore = Math.min(minScore, score);
            beta = Math.min(beta, score);
            if (beta <= alpha) break;
        }
        return minScore;
    }
}

// Evaluate position
function evaluatePosition(chess) {
    const board = chess.board();
    let evaluation = 0;

    // Piece values
    const pieceValues = {
        'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 0
    };

    // Count material
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece) {
                const value = pieceValues[piece.type];
                if (piece.color === 'w') {
                    evaluation += value;
                } else {
                    evaluation -= value;
                }
            }
        }
    }

    // Add position bonuses
    if (chess.isCheck()) {
        evaluation += chess.turn() === 'w' ? -0.5 : 0.5;
    }

    if (chess.isCheckmate()) {
        evaluation += chess.turn() === 'w' ? -1000 : 1000;
    }

    if (chess.isStalemate()) {
        evaluation = 0;
    }

    return evaluation;
}

// Handle game over
function handleGameOver(gameState, chess) {
    let winner = null;
    let reason = '';

    if (chess.isCheckmate()) {
        winner = chess.turn() === 'w' ? 'black' : 'white';
        reason = 'checkmate';
    } else if (chess.isStalemate()) {
        winner = 'draw';
        reason = 'stalemate';
    } else if (chess.isDraw()) {
        winner = 'draw';
        reason = 'draw';
    }

    return {
        gameOver: true,
        winner,
        reason,
        pgn: chess.pgn(),
        finalFen: chess.fen()
    };
}

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'computer-opponent-service' });
});

app.listen(PORT, () => {
    console.log(`Computer Opponent Service listening on port ${PORT}`);
});
