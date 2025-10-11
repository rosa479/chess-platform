require('dotenv').config();
const express = require('express');
const { createClient } = require('redis');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3009;

// Redis client
const redisClient = createClient({ url: process.env.REDIS_URL });
redisClient.on('error', (err) => console.log('Redis Client Error', err));

// Connect to Redis
(async () => {
    try {
        await redisClient.connect();
        console.log('Connected to Redis for spectate service');
    } catch (err) {
        console.error('Failed to connect to Redis:', err);
        process.exit(1);
    }
})();

// Get ongoing games feed
app.get('/games/ongoing', async (req, res) => {
    try {
        const { limit = 20, timeControl, ratingRange } = req.query;
        
        // Get all active games from Redis
        const gameKeys = await redisClient.keys('game:*');
        const ongoingGames = [];
        
        for (const key of gameKeys) {
            const gameData = await redisClient.get(key);
            if (gameData) {
                const game = JSON.parse(gameData);
                
                // Filter by time control if specified
                if (timeControl && game.timeControl !== timeControl) {
                    continue;
                }
                
                // Filter by rating range if specified
                if (ratingRange) {
                    const [minRating, maxRating] = ratingRange.split('-').map(Number);
                    if (game.whiteRating < minRating || game.whiteRating > maxRating ||
                        game.blackRating < minRating || game.blackRating > maxRating) {
                        continue;
                    }
                }
                
                // Get player information
                const whitePlayer = await getUserInfo(game.whitePlayerId);
                const blackPlayer = await getUserInfo(game.blackPlayerId);
                
                ongoingGames.push({
                    gameId: game.gameId,
                    whitePlayer: {
                        userId: game.whitePlayerId,
                        username: whitePlayer?.username || 'Unknown',
                        rating: game.whiteRating || 1200
                    },
                    blackPlayer: {
                        userId: game.blackPlayerId,
                        username: blackPlayer?.username || 'Unknown',
                        rating: game.blackRating || 1200
                    },
                    timeControl: game.timeControl,
                    moveCount: game.moveCount || 0,
                    lastMove: game.lastMove,
                    spectators: game.spectators || 0,
                    startedAt: game.startedAt,
                    currentTurn: game.currentTurn || 'white'
                });
            }
        }
        
        // Sort by number of spectators (most popular first)
        ongoingGames.sort((a, b) => b.spectators - a.spectators);
        
        // Limit results
        const limitedGames = ongoingGames.slice(0, parseInt(limit));
        
        res.json(limitedGames);
    } catch (error) {
        console.error('Get ongoing games error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get specific game for spectating
app.get('/games/:gameId/spectate', async (req, res) => {
    try {
        const { gameId } = req.params;
        
        const gameData = await redisClient.get(`game:${gameId}`);
        if (!gameData) {
            return res.status(404).json({ error: 'Game not found' });
        }
        
        const game = JSON.parse(gameData);
        
        // Get player information
        const whitePlayer = await getUserInfo(game.whitePlayerId);
        const blackPlayer = await getUserInfo(game.blackPlayerId);
        
        const spectateData = {
            gameId: game.gameId,
            whitePlayer: {
                userId: game.whitePlayerId,
                username: whitePlayer?.username || 'Unknown',
                rating: game.whiteRating || 1200
            },
            blackPlayer: {
                userId: game.blackPlayerId,
                username: blackPlayer?.username || 'Unknown',
                rating: game.blackRating || 1200
            },
            fen: game.fen,
            timeControl: game.timeControl,
            whiteTimeLeft: game.whiteTimeLeftMs,
            blackTimeLeft: game.blackTimeLeftMs,
            moveCount: game.moveCount || 0,
            lastMove: game.lastMove,
            spectators: game.spectators || 0,
            startedAt: game.startedAt,
            currentTurn: game.currentTurn || 'white',
            isGameOver: game.isGameOver || false,
            gameResult: game.gameResult || null
        };
        
        res.json(spectateData);
    } catch (error) {
        console.error('Get spectate game error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Join game as spectator
app.post('/games/:gameId/spectate/join', async (req, res) => {
    try {
        const { gameId } = req.params;
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }
        
        const gameData = await redisClient.get(`game:${gameId}`);
        if (!gameData) {
            return res.status(404).json({ error: 'Game not found' });
        }
        
        const game = JSON.parse(gameData);
        
        // Initialize spectators if not exists
        if (!game.spectators) {
            game.spectators = 0;
        }
        
        // Add spectator
        game.spectators++;
        await redisClient.set(`game:${gameId}`, JSON.stringify(game));
        
        // Track spectator
        const spectatorKey = `spectators:${gameId}`;
        await redisClient.sAdd(spectatorKey, userId);
        
        res.json({ 
            message: 'Joined as spectator',
            spectators: game.spectators
        });
    } catch (error) {
        console.error('Join spectate error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Leave game as spectator
app.post('/games/:gameId/spectate/leave', async (req, res) => {
    try {
        const { gameId } = req.params;
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }
        
        const gameData = await redisClient.get(`game:${gameId}`);
        if (!gameData) {
            return res.status(404).json({ error: 'Game not found' });
        }
        
        const game = JSON.parse(gameData);
        
        // Remove spectator
        if (game.spectators > 0) {
            game.spectators--;
        }
        await redisClient.set(`game:${gameId}`, JSON.stringify(game));
        
        // Remove from spectators set
        const spectatorKey = `spectators:${gameId}`;
        await redisClient.sRem(spectatorKey, userId);
        
        res.json({ 
            message: 'Left spectating',
            spectators: game.spectators
        });
    } catch (error) {
        console.error('Leave spectate error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get spectators for a game
app.get('/games/:gameId/spectators', async (req, res) => {
    try {
        const { gameId } = req.params;
        
        const spectatorKey = `spectators:${gameId}`;
        const spectatorIds = await redisClient.sMembers(spectatorKey);
        
        const spectators = [];
        for (const userId of spectatorIds) {
            const userInfo = await getUserInfo(userId);
            if (userInfo) {
                spectators.push({
                    userId,
                    username: userInfo.username,
                    rating: userInfo.rating
                });
            }
        }
        
        res.json(spectators);
    } catch (error) {
        console.error('Get spectators error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get popular games (most spectators)
app.get('/games/popular', async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        
        const gameKeys = await redisClient.keys('game:*');
        const games = [];
        
        for (const key of gameKeys) {
            const gameData = await redisClient.get(key);
            if (gameData) {
                const game = JSON.parse(gameData);
                if (game.spectators > 0) {
                    games.push({
                        gameId: game.gameId,
                        spectators: game.spectators,
                        whitePlayer: game.whitePlayerId,
                        blackPlayer: game.blackPlayerId,
                        timeControl: game.timeControl,
                        moveCount: game.moveCount || 0
                    });
                }
            }
        }
        
        // Sort by spectators
        games.sort((a, b) => b.spectators - a.spectators);
        
        // Limit results
        const limitedGames = games.slice(0, parseInt(limit));
        
        res.json(limitedGames);
    } catch (error) {
        console.error('Get popular games error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get games by player
app.get('/players/:userId/games', async (req, res) => {
    try {
        const { userId } = req.params;
        const { status = 'ongoing' } = req.query;
        
        const gameKeys = await redisClient.keys('game:*');
        const playerGames = [];
        
        for (const key of gameKeys) {
            const gameData = await redisClient.get(key);
            if (gameData) {
                const game = JSON.parse(gameData);
                
                if (game.whitePlayerId === userId || game.blackPlayerId === userId) {
                    const isOngoing = !game.isGameOver;
                    
                    if ((status === 'ongoing' && isOngoing) || 
                        (status === 'completed' && !isOngoing)) {
                        
                        const opponentId = game.whitePlayerId === userId ? game.blackPlayerId : game.whitePlayerId;
                        const opponent = await getUserInfo(opponentId);
                        
                        playerGames.push({
                            gameId: game.gameId,
                            opponent: {
                                userId: opponentId,
                                username: opponent?.username || 'Unknown',
                                rating: opponent?.rating || 1200
                            },
                            playerColor: game.whitePlayerId === userId ? 'white' : 'black',
                            timeControl: game.timeControl,
                            result: game.gameResult,
                            startedAt: game.startedAt,
                            spectators: game.spectators || 0
                        });
                    }
                }
            }
        }
        
        // Sort by start time
        playerGames.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
        
        res.json(playerGames);
    } catch (error) {
        console.error('Get player games error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get user info from user service
async function getUserInfo(userId) {
    try {
        const userData = await redisClient.get(`user:${userId}`);
        if (userData) {
            const user = JSON.parse(userData);
            return {
                username: user.username,
                rating: user.rating
            };
        }
        return null;
    } catch (error) {
        console.error('Get user info error:', error);
        return null;
    }
}

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'spectate-service' });
});

app.listen(PORT, () => {
    console.log(`Spectate Service listening on port ${PORT}`);
});
