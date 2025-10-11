require('dotenv').config();
const express = require('express');
const { createClient } = require('redis');
const { v4: uuidv4 } = require('uuid');
const { Chess } = require('chess.js');

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3013;

// Redis client
const redisClient = createClient({ url: process.env.REDIS_URL });
redisClient.on('error', (err) => console.log('Redis Client Error', err));

// Connect to Redis
(async () => {
    try {
        await redisClient.connect();
        console.log('Connected to Redis for game history service');
    } catch (err) {
        console.error('Failed to connect to Redis:', err);
        process.exit(1);
    }
})();

// Save completed game
app.post('/games/save', async (req, res) => {
    try {
        const {
            gameId,
            whitePlayerId,
            blackPlayerId,
            whiteUsername,
            blackUsername,
            whiteRating,
            blackRating,
            result,
            termination,
            timeControl,
            pgn,
            moves,
            gameDuration,
            startedAt,
            endedAt
        } = req.body;
        
        if (!gameId || !whitePlayerId || !blackPlayerId || !result) {
            return res.status(400).json({ error: 'Game ID, player IDs, and result are required' });
        }
        
        const gameHistory = {
            gameId,
            whitePlayerId,
            blackPlayerId,
            whiteUsername: whiteUsername || 'Unknown',
            blackUsername: blackUsername || 'Unknown',
            whiteRating: whiteRating || 1200,
            blackRating: blackRating || 1200,
            result, // 'white', 'black', 'draw'
            termination, // 'checkmate', 'stalemate', 'timeout', 'resignation', etc.
            timeControl,
            pgn: pgn || '',
            moves: moves || [],
            gameDuration: gameDuration || 0,
            startedAt: startedAt || new Date().toISOString(),
            endedAt: endedAt || new Date().toISOString(),
            createdAt: new Date().toISOString()
        };
        
        // Save game history
        await redisClient.set(`game_history:${gameId}`, JSON.stringify(gameHistory));
        
        // Add to player histories
        await addToPlayerHistory(whitePlayerId, gameHistory, 'white');
        await addToPlayerHistory(blackPlayerId, gameHistory, 'black');
        
        // Add to recent games list
        await redisClient.lPush('recent_games', gameId);
        await redisClient.lTrim('recent_games', 0, 999); // Keep last 1000 games
        
        res.json({ message: 'Game saved successfully', gameId });
    } catch (error) {
        console.error('Save game error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get user game history
app.get('/users/:userId/games', async (req, res) => {
    try {
        const { userId } = req.params;
        const { 
            limit = 50, 
            offset = 0, 
            timeControl, 
            result, 
            opponent,
            startDate,
            endDate
        } = req.query;
        
        const historyKey = `user_games:${userId}`;
        const gameIds = await redisClient.lRange(historyKey, parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
        
        const games = [];
        for (const gameId of gameIds) {
            const gameData = await redisClient.get(`game_history:${gameId}`);
            if (gameData) {
                const game = JSON.parse(gameData);
                
                // Apply filters
                if (timeControl && game.timeControl !== timeControl) continue;
                if (result && game.result !== result) continue;
                if (opponent) {
                    const isOpponent = game.whitePlayerId === opponent || game.blackPlayerId === opponent;
                    if (!isOpponent) continue;
                }
                if (startDate && new Date(game.startedAt) < new Date(startDate)) continue;
                if (endDate && new Date(game.startedAt) > new Date(endDate)) continue;
                
                games.push(game);
            }
        }
        
        res.json(games);
    } catch (error) {
        console.error('Get user games error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get specific game
app.get('/games/:gameId', async (req, res) => {
    try {
        const { gameId } = req.params;
        
        const gameData = await redisClient.get(`game_history:${gameId}`);
        if (!gameData) {
            return res.status(404).json({ error: 'Game not found' });
        }
        
        const game = JSON.parse(gameData);
        res.json(game);
    } catch (error) {
        console.error('Get game error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get user statistics
app.get('/users/:userId/stats', async (req, res) => {
    try {
        const { userId } = req.params;
        const { timeControl } = req.query;
        
        const historyKey = `user_games:${userId}`;
        const gameIds = await redisClient.lRange(historyKey, 0, -1);
        
        const stats = {
            totalGames: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            winRate: 0,
            averageGameDuration: 0,
            longestGame: 0,
            shortestGame: Infinity,
            timeControlStats: {},
            monthlyStats: {},
            opponentStats: {},
            openingStats: {},
            endgameStats: {}
        };
        
        let totalDuration = 0;
        const monthlyGames = {};
        const opponentGames = {};
        const openingGames = {};
        const endgameGames = {};
        
        for (const gameId of gameIds) {
            const gameData = await redisClient.get(`game_history:${gameId}`);
            if (gameData) {
                const game = JSON.parse(gameData);
                
                // Filter by time control if specified
                if (timeControl && game.timeControl !== timeControl) continue;
                
                stats.totalGames++;
                totalDuration += game.gameDuration || 0;
                
                // Update win/loss/draw stats
                if (game.result === 'white' && game.whitePlayerId === userId) {
                    stats.wins++;
                } else if (game.result === 'black' && game.blackPlayerId === userId) {
                    stats.wins++;
                } else if (game.result === 'draw') {
                    stats.draws++;
                } else {
                    stats.losses++;
                }
                
                // Update game duration stats
                if (game.gameDuration) {
                    stats.longestGame = Math.max(stats.longestGame, game.gameDuration);
                    stats.shortestGame = Math.min(stats.shortestGame, game.gameDuration);
                }
                
                // Update time control stats
                if (!stats.timeControlStats[game.timeControl]) {
                    stats.timeControlStats[game.timeControl] = { games: 0, wins: 0, losses: 0, draws: 0 };
                }
                stats.timeControlStats[game.timeControl].games++;
                
                if (game.result === 'white' && game.whitePlayerId === userId) {
                    stats.timeControlStats[game.timeControl].wins++;
                } else if (game.result === 'black' && game.blackPlayerId === userId) {
                    stats.timeControlStats[game.timeControl].wins++;
                } else if (game.result === 'draw') {
                    stats.timeControlStats[game.timeControl].draws++;
                } else {
                    stats.timeControlStats[game.timeControl].losses++;
                }
                
                // Update monthly stats
                const month = game.startedAt.substring(0, 7); // YYYY-MM
                if (!monthlyGames[month]) {
                    monthlyGames[month] = { games: 0, wins: 0, losses: 0, draws: 0 };
                }
                monthlyGames[month].games++;
                
                if (game.result === 'white' && game.whitePlayerId === userId) {
                    monthlyGames[month].wins++;
                } else if (game.result === 'black' && game.blackPlayerId === userId) {
                    monthlyGames[month].wins++;
                } else if (game.result === 'draw') {
                    monthlyGames[month].draws++;
                } else {
                    monthlyGames[month].losses++;
                }
                
                // Update opponent stats
                const opponentId = game.whitePlayerId === userId ? game.blackPlayerId : game.whitePlayerId;
                const opponentName = game.whitePlayerId === userId ? game.blackUsername : game.whiteUsername;
                
                if (!opponentGames[opponentId]) {
                    opponentGames[opponentId] = { 
                        name: opponentName, 
                        games: 0, 
                        wins: 0, 
                        losses: 0, 
                        draws: 0 
                    };
                }
                opponentGames[opponentId].games++;
                
                if (game.result === 'white' && game.whitePlayerId === userId) {
                    opponentGames[opponentId].wins++;
                } else if (game.result === 'black' && game.blackPlayerId === userId) {
                    opponentGames[opponentId].wins++;
                } else if (game.result === 'draw') {
                    opponentGames[opponentId].draws++;
                } else {
                    opponentGames[opponentId].losses++;
                }
                
                // Analyze opening (first 10 moves)
                if (game.moves && game.moves.length > 0) {
                    const openingMoves = game.moves.slice(0, Math.min(10, game.moves.length));
                    const openingKey = openingMoves.join(' ');
                    
                    if (!openingGames[openingKey]) {
                        openingGames[openingKey] = { games: 0, wins: 0, losses: 0, draws: 0 };
                    }
                    openingGames[openingKey].games++;
                    
                    if (game.result === 'white' && game.whitePlayerId === userId) {
                        openingGames[openingKey].wins++;
                    } else if (game.result === 'black' && game.blackPlayerId === userId) {
                        openingGames[openingKey].wins++;
                    } else if (game.result === 'draw') {
                        openingGames[openingKey].draws++;
                    } else {
                        openingGames[openingKey].losses++;
                    }
                }
                
                // Analyze endgame (last 10 moves)
                if (game.moves && game.moves.length > 10) {
                    const endgameMoves = game.moves.slice(-10);
                    const endgameKey = endgameMoves.join(' ');
                    
                    if (!endgameGames[endgameKey]) {
                        endgameGames[endgameKey] = { games: 0, wins: 0, losses: 0, draws: 0 };
                    }
                    endgameGames[endgameKey].games++;
                    
                    if (game.result === 'white' && game.whitePlayerId === userId) {
                        endgameGames[endgameKey].wins++;
                    } else if (game.result === 'black' && game.blackPlayerId === userId) {
                        endgameGames[endgameKey].wins++;
                    } else if (game.result === 'draw') {
                        endgameGames[endgameKey].draws++;
                    } else {
                        endgameGames[endgameKey].losses++;
                    }
                }
            }
        }
        
        // Calculate final stats
        stats.winRate = stats.totalGames > 0 ? (stats.wins / stats.totalGames) * 100 : 0;
        stats.averageGameDuration = stats.totalGames > 0 ? totalDuration / stats.totalGames : 0;
        stats.monthlyStats = monthlyGames;
        stats.opponentStats = opponentGames;
        stats.openingStats = openingGames;
        stats.endgameStats = endgameGames;
        
        res.json(stats);
    } catch (error) {
        console.error('Get user stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get recent games
app.get('/games/recent', async (req, res) => {
    try {
        const { limit = 20 } = req.query;
        
        const gameIds = await redisClient.lRange('recent_games', 0, parseInt(limit) - 1);
        const games = [];
        
        for (const gameId of gameIds) {
            const gameData = await redisClient.get(`game_history:${gameId}`);
            if (gameData) {
                const game = JSON.parse(gameData);
                games.push(game);
            }
        }
        
        res.json(games);
    } catch (error) {
        console.error('Get recent games error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add game to player history
async function addToPlayerHistory(playerId, gameHistory, playerColor) {
    const historyKey = `user_games:${playerId}`;
    await redisClient.lPush(historyKey, gameHistory.gameId);
    await redisClient.lTrim(historyKey, 0, 9999); // Keep last 10,000 games per player
}

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'game-history-service' });
});

app.listen(PORT, () => {
    console.log(`Game History Service listening on port ${PORT}`);
});
