require('dotenv').config();
const express = require('express');
const Redis = require('ioredis');
const { Chess } = require('chess.js');

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3004;

// Redis client
const redisClient = new Redis({ host: 'redis', port: 6379, family: 4 });
redisClient.on('error', (err) => console.log('Redis Client Error', err));

// Connect to Redis
(async () => {
    try {
        await redisClient.connect();
        console.log('Connected to Redis for AI analysis service');
    } catch (err) {
        console.error('Failed to connect to Redis:', err);
        process.exit(1);
    }
})();

// Simple evaluation function (in a real implementation, you'd use Stockfish or similar)
function evaluatePosition(chess) {
    const fen = chess.fen();
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
    
    // Add position bonuses (simplified)
    // In a real engine, this would be much more sophisticated
    if (chess.isCheck()) {
        evaluation += chess.turn() === 'w' ? -0.5 : 0.5;
    }
    
    return evaluation;
}

// Get best move (simplified minimax)
function getBestMove(chess, depth = 2) {
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
            if (beta <= alpha) break; // Alpha-beta pruning
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
            if (beta <= alpha) break; // Alpha-beta pruning
        }
        return minScore;
    }
}

// Analyze a position
app.post('/analyze', async (req, res) => {
    try {
        const { fen, depth = 3 } = req.body;
        
        if (!fen) {
            return res.status(400).json({ error: 'FEN is required' });
        }
        
        const chess = new Chess(fen);
        
        // Validate FEN
        if (!chess.validate_fen(fen).valid) {
            return res.status(400).json({ error: 'Invalid FEN' });
        }
        
        // Get analysis
        const evaluation = evaluatePosition(chess);
        const bestMove = getBestMove(chess, depth);
        const legalMoves = chess.moves({ verbose: true });
        
        // Analyze each legal move
        const moveAnalysis = legalMoves.map(move => {
            chess.move(move);
            const moveEval = evaluatePosition(chess);
            chess.undo();
            
            return {
                move: move.san,
                evaluation: moveEval,
                uci: move.from + move.to + (move.promotion || '')
            };
        });
        
        // Sort moves by evaluation
        moveAnalysis.sort((a, b) => {
            if (chess.turn() === 'w') {
                return b.evaluation - a.evaluation;
            } else {
                return a.evaluation - b.evaluation;
            }
        });
        
        const analysis = {
            fen,
            evaluation,
            bestMove: bestMove ? {
                san: bestMove.san,
                uci: bestMove.from + bestMove.to + (bestMove.promotion || '')
            } : null,
            legalMoves: legalMoves.length,
            moveAnalysis: moveAnalysis.slice(0, 5), // Top 5 moves
            gameStatus: {
                isCheck: chess.isCheck(),
                isCheckmate: chess.isCheckmate(),
                isStalemate: chess.isStalemate(),
                isDraw: chess.isDraw(),
                isGameOver: chess.isGameOver()
            }
        };
        
        res.json(analysis);
        
    } catch (error) {
        console.error('Analysis error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Analyze a game (PGN)
app.post('/analyze-game', async (req, res) => {
    try {
        const { pgn } = req.body;
        
        if (!pgn) {
            return res.status(400).json({ error: 'PGN is required' });
        }
        
        const chess = new Chess();
        chess.loadPgn(pgn);
        
        const moves = chess.history({ verbose: true });
        const analysis = [];
        
        // Analyze each position after each move
        const tempChess = new Chess();
        for (let i = 0; i < moves.length; i++) {
            const move = moves[i];
            tempChess.move(move);
            
            const evaluation = evaluatePosition(tempChess);
            analysis.push({
                moveNumber: Math.floor(i / 2) + 1,
                move: move.san,
                evaluation,
                fen: tempChess.fen()
            });
        }
        
        res.json({
            pgn,
            totalMoves: moves.length,
            analysis,
            finalPosition: {
                fen: chess.fen(),
                evaluation: evaluatePosition(chess),
                gameStatus: {
                    isCheck: chess.isCheck(),
                    isCheckmate: chess.isCheckmate(),
                    isStalemate: chess.isStalemate(),
                    isDraw: chess.isDraw(),
                    isGameOver: chess.isGameOver()
                }
            }
        });
        
    } catch (error) {
        console.error('Game analysis error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get opening book suggestions
app.get('/opening-book', async (req, res) => {
    try {
        const { fen } = req.query;
        
        if (!fen) {
            return res.status(400).json({ error: 'FEN is required' });
        }
        
        const chess = new Chess(fen);
        const moves = chess.moves({ verbose: true });
        
        // Simple opening book (in a real implementation, you'd use a proper opening database)
        const openingBook = {
            'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1': [
                { move: 'e4', name: 'King\'s Pawn Opening' },
                { move: 'd4', name: 'Queen\'s Pawn Opening' },
                { move: 'Nf3', name: 'Reti Opening' },
                { move: 'c4', name: 'English Opening' }
            ]
        };
        
        const currentFen = chess.fen().split(' ').slice(0, 4).join(' '); // Remove move counters
        const suggestions = openingBook[currentFen] || [];
        
        res.json({
            fen: currentFen,
            suggestions: suggestions.filter(s => 
                moves.some(m => m.san === s.move)
            )
        });
        
    } catch (error) {
        console.error('Opening book error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'ai-analysis-service' });
});

app.listen(PORT, () => {
    console.log(`AI Analysis Service listening on port ${PORT}`);
});
