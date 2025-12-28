require('dotenv').config();
const express = require('express');
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');
const { Chess } = require('chess.js');
const { spawn } = require('child_process');

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3011;

// Redis client
const redisClient = new Redis({ host: 'redis', port: 6379, family: 4 });
redisClient.on('error', (err) => console.log('Redis Client Error', err));

// Connect to Redis
(async () => {
    try {
        await redisClient.connect();
        console.log('Connected to Redis for analysis tools service');
    } catch (err) {
        console.error('Failed to connect to Redis:', err);
        process.exit(1);
    }
})();

// Stockfish configuration
const STOCKFISH_PATH = process.env.STOCKFISH_PATH || 'stockfish';
const STOCKFISH_DEPTH = parseInt(process.env.STOCKFISH_DEPTH) || 15;
const STOCKFISH_THREADS = parseInt(process.env.STOCKFISH_THREADS) || 4;
const STOCKFISH_HASH = parseInt(process.env.STOCKFISH_HASH) || 256;

// Analysis board - analyze position
app.post('/analyze/position', async (req, res) => {
    try {
        const { fen, depth = STOCKFISH_DEPTH, multipv = 3 } = req.body;
        
        if (!fen) {
            return res.status(400).json({ error: 'FEN is required' });
        }
        
        // Validate FEN
        const chess = new Chess();
        if (!chess.load(fen)) {
            return res.status(400).json({ error: 'Invalid FEN' });
        }
        
        // Check cache first
        const cacheKey = `analysis:${fen}:${depth}:${multipv}`;
        const cachedAnalysis = await redisClient.get(cacheKey);
        
        if (cachedAnalysis) {
            return res.json(JSON.parse(cachedAnalysis));
        }
        
        // Analyze with Stockfish
        const analysis = await analyzeWithStockfish(fen, depth, multipv);
        
        // Cache the result
        await redisClient.set(cacheKey, JSON.stringify(analysis), { EX: 3600 }); // 1 hour cache
        
        res.json(analysis);
    } catch (error) {
        console.error('Analyze position error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Analyze game from PGN
app.post('/analyze/game', async (req, res) => {
    try {
        const { pgn, depth = STOCKFISH_DEPTH } = req.body;
        
        if (!pgn) {
            return res.status(400).json({ error: 'PGN is required' });
        }
        
        const chess = new Chess();
        if (!chess.loadPgn(pgn)) {
            return res.status(400).json({ error: 'Invalid PGN' });
        }
        
        const moves = chess.history({ verbose: true });
        const analysis = {
            pgn,
            totalMoves: moves.length,
            moves: [],
            gameAnalysis: {
                accuracy: 0,
                mistakes: 0,
                blunders: 0,
                bestMoves: 0
            }
        };
        
        // Analyze each position
        const tempChess = new Chess();
        let totalAccuracy = 0;
        
        for (let i = 0; i < moves.length; i++) {
            const move = moves[i];
            const positionBefore = tempChess.fen();
            
            // Analyze position before move
            const positionAnalysis = await analyzeWithStockfish(positionBefore, depth, 1);
            const bestMove = positionAnalysis.bestMove;
            
            tempChess.move(move);
            const positionAfter = tempChess.fen();
            
            // Analyze position after move
            const afterAnalysis = await analyzeWithStockfish(positionAfter, depth, 1);
            
            const moveAnalysis = {
                moveNumber: Math.floor(i / 2) + 1,
                move: move.san,
                fen: positionAfter,
                evaluation: afterAnalysis.evaluation,
                bestMove: bestMove,
                isBestMove: bestMove && bestMove.san === move.san,
                accuracy: calculateMoveAccuracy(bestMove, afterAnalysis.evaluation)
            };
            
            analysis.moves.push(moveAnalysis);
            totalAccuracy += moveAnalysis.accuracy;
            
            // Count mistakes and blunders
            if (moveAnalysis.accuracy < 0.5) {
                analysis.gameAnalysis.mistakes++;
            }
            if (moveAnalysis.accuracy < 0.2) {
                analysis.gameAnalysis.blunders++;
            }
            if (moveAnalysis.isBestMove) {
                analysis.gameAnalysis.bestMoves++;
            }
        }
        
        analysis.gameAnalysis.accuracy = totalAccuracy / moves.length;
        
        res.json(analysis);
    } catch (error) {
        console.error('Analyze game error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Import FEN and start analysis
app.post('/import/fen', async (req, res) => {
    try {
        const { fen, userId } = req.body;
        
        if (!fen) {
            return res.status(400).json({ error: 'FEN is required' });
        }
        
        // Validate FEN
        const chess = new Chess();
        if (!chess.load(fen)) {
            return res.status(400).json({ error: 'Invalid FEN' });
        }
        
        const analysisId = uuidv4();
        const analysisSession = {
            analysisId,
            userId: userId || 'anonymous',
            fen,
            createdAt: new Date().toISOString(),
            moves: [],
            currentPosition: fen
        };
        
        await redisClient.set(`analysis_session:${analysisId}`, JSON.stringify(analysisSession));
        
        res.json({
            analysisId,
            fen,
            message: 'Analysis session created'
        });
    } catch (error) {
        console.error('Import FEN error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Import PGN and start analysis
app.post('/import/pgn', async (req, res) => {
    try {
        const { pgn, userId } = req.body;
        
        if (!pgn) {
            return res.status(400).json({ error: 'PGN is required' });
        }
        
        const chess = new Chess();
        if (!chess.loadPgn(pgn)) {
            return res.status(400).json({ error: 'Invalid PGN' });
        }
        
        const analysisId = uuidv4();
        const moves = chess.history({ verbose: true });
        
        const analysisSession = {
            analysisId,
            userId: userId || 'anonymous',
            pgn,
            moves,
            currentMoveIndex: moves.length - 1,
            createdAt: new Date().toISOString()
        };
        
        await redisClient.set(`analysis_session:${analysisId}`, JSON.stringify(analysisSession));
        
        res.json({
            analysisId,
            pgn,
            moves: moves.length,
            message: 'PGN imported successfully'
        });
    } catch (error) {
        console.error('Import PGN error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get analysis session
app.get('/analysis/:analysisId', async (req, res) => {
    try {
        const { analysisId } = req.params;
        
        const sessionData = await redisClient.get(`analysis_session:${analysisId}`);
        if (!sessionData) {
            return res.status(404).json({ error: 'Analysis session not found' });
        }
        
        const session = JSON.parse(sessionData);
        res.json(session);
    } catch (error) {
        console.error('Get analysis session error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Make move in analysis session
app.post('/analysis/:analysisId/move', async (req, res) => {
    try {
        const { analysisId } = req.params;
        const { move } = req.body;
        
        if (!move) {
            return res.status(400).json({ error: 'Move is required' });
        }
        
        const sessionData = await redisClient.get(`analysis_session:${analysisId}`);
        if (!sessionData) {
            return res.status(404).json({ error: 'Analysis session not found' });
        }
        
        const session = JSON.parse(sessionData);
        const chess = new Chess(session.currentPosition || session.fen);
        
        const moveResult = chess.move(move);
        if (!moveResult) {
            return res.status(400).json({ error: 'Invalid move' });
        }
        
        session.currentPosition = chess.fen();
        session.moves.push({
            move: moveResult.san,
            fen: chess.fen(),
            timestamp: new Date().toISOString()
        });
        
        await redisClient.set(`analysis_session:${analysisId}`, JSON.stringify(session));
        
        res.json({
            move: moveResult,
            newPosition: chess.fen(),
            session
        });
    } catch (error) {
        console.error('Make move in analysis error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Analyze with Stockfish
async function analyzeWithStockfish(fen, depth, multipv) {
    return new Promise((resolve, reject) => {
        const stockfish = spawn(STOCKFISH_PATH);
        let output = '';
        
        stockfish.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        stockfish.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Stockfish exited with code ${code}`));
                return;
            }
            
            try {
                const analysis = parseStockfishOutput(output, multipv);
                resolve(analysis);
            } catch (error) {
                reject(error);
            }
        });
        
        stockfish.on('error', (error) => {
            reject(error);
        });
        
        // Send commands to Stockfish
        stockfish.stdin.write('uci\n');
        stockfish.stdin.write(`setoption name Threads value ${STOCKFISH_THREADS}\n`);
        stockfish.stdin.write(`setoption name Hash value ${STOCKFISH_HASH}\n`);
        stockfish.stdin.write(`position fen ${fen}\n`);
        stockfish.stdin.write(`go depth ${depth} multipv ${multipv}\n`);
        
        setTimeout(() => {
            stockfish.kill();
            reject(new Error('Stockfish analysis timeout'));
        }, 30000); // 30 second timeout
    });
}

// Parse Stockfish output
function parseStockfishOutput(output, multipv) {
    const lines = output.split('\n');
    const analysis = {
        evaluation: 0,
        bestMove: null,
        pv: [],
        depth: 0,
        nodes: 0,
        time: 0
    };
    
    for (const line of lines) {
        if (line.includes('info depth')) {
            const match = line.match(/depth (\d+).*score (cp|mate) (-?\d+).*pv (.+)/);
            if (match) {
                analysis.depth = parseInt(match[1]);
                const scoreType = match[2];
                const score = parseInt(match[3]);
                
                if (scoreType === 'cp') {
                    analysis.evaluation = score / 100; // Convert centipawns to pawns
                } else {
                    analysis.evaluation = score > 0 ? 1000 : -1000; // Mate score
                }
                
                const pv = match[4].split(' ');
                analysis.bestMove = { san: pv[0], uci: pv[0] };
                analysis.pv = pv;
            }
        }
        
        if (line.includes('nodes')) {
            const match = line.match(/nodes (\d+)/);
            if (match) {
                analysis.nodes = parseInt(match[1]);
            }
        }
        
        if (line.includes('time')) {
            const match = line.match(/time (\d+)/);
            if (match) {
                analysis.time = parseInt(match[1]);
            }
        }
    }
    
    return analysis;
}

// Calculate move accuracy
function calculateMoveAccuracy(bestMove, evaluation) {
    if (!bestMove) return 0;
    
    // Simple accuracy calculation based on evaluation
    const maxAccuracy = 1.0;
    const minAccuracy = 0.0;
    
    // This is a simplified calculation
    // In practice, you'd compare the played move's evaluation with the best move's evaluation
    return Math.max(minAccuracy, Math.min(maxAccuracy, 0.8 + (evaluation / 1000)));
}

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'analysis-tools-service' });
});

app.listen(PORT, () => {
    console.log(`Analysis Tools Service listening on port ${PORT}`);
});
