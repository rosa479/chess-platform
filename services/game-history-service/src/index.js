require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { Chess } = require('chess.js');
const mongoose = require('mongoose');
const GameHistory = require('./models/GameHistory');

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3005;

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URL || 'mongodb://mongodb:27017/chess-history').then(() => {
    console.log('Connected to MongoDB for game history service');
}).catch((err) => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
});

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
        
        const gameHistory = new GameHistory({
            gameId,
            whitePlayerId,
            blackPlayerId,
            whiteUsername: whiteUsername || 'Unknown',
            blackUsername: blackUsername || 'Unknown',
            whiteRating: whiteRating || 1200,
            blackRating: blackRating || 1200,
            result,
            termination,
            timeControl,
            pgn: pgn || '',
            moves: moves || [],
            gameDuration: gameDuration || 0,
            startedAt: startedAt ? new Date(startedAt) : new Date(),
            endedAt: endedAt ? new Date(endedAt) : new Date(),
            createdAt: new Date()
        });
        await gameHistory.save();
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

        const query = {
            $or: [
                { whitePlayerId: userId },
                { blackPlayerId: userId }
            ]
        };
        if (timeControl) query.timeControl = timeControl;
        if (result) query.result = result;
        if (opponent) query.$or = [
            { whitePlayerId: userId, blackPlayerId: opponent },
            { blackPlayerId: userId, whitePlayerId: opponent }
        ];
        if (startDate) query.startedAt = { ...query.startedAt, $gte: new Date(startDate) };
        if (endDate) query.startedAt = { ...query.startedAt, $lte: new Date(endDate) };

        const games = await GameHistory.find(query)
            .sort({ startedAt: -1 })
            .skip(Number(offset))
            .limit(Number(limit));
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
        const game = await GameHistory.findOne({ gameId });
        if (!game) {
            return res.status(404).json({ error: 'Game not found' });
        }
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

        const query = {
            $or: [
                { whitePlayerId: userId },
                { blackPlayerId: userId }
            ]
        };
        if (timeControl) query.timeControl = timeControl;
        const games = await GameHistory.find(query);

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
        for (const game of games) {
            stats.totalGames++;
            totalDuration += game.gameDuration || 0;
            if (game.result === 'white' && game.whitePlayerId === userId) {
                stats.wins++;
            } else if (game.result === 'black' && game.blackPlayerId === userId) {
                stats.wins++;
            } else if (game.result === 'draw') {
                stats.draws++;
            } else {
                stats.losses++;
            }
            if (game.gameDuration) {
                stats.longestGame = Math.max(stats.longestGame, game.gameDuration);
                stats.shortestGame = Math.min(stats.shortestGame, game.gameDuration);
            }
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
            const month = (game.startedAt instanceof Date ? game.startedAt : new Date(game.startedAt)).toISOString().substring(0, 7);
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
            const opponentId = game.whitePlayerId === userId ? game.blackPlayerId : game.whitePlayerId;
            const opponentName = game.whitePlayerId === userId ? game.blackUsername : game.whiteUsername;
            if (!opponentGames[opponentId]) {
                opponentGames[opponentId] = { name: opponentName, games: 0, wins: 0, losses: 0, draws: 0 };
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
        const games = await GameHistory.find({})
            .sort({ startedAt: -1 })
            .limit(Number(limit));
        res.json(games);
    } catch (error) {
        console.error('Get recent games error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Removed: No longer needed, handled via query filters on MongoDB.


// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'game-history-service' });
});

app.listen(PORT, () => {
    console.log(`Game History Service listening on port ${PORT}`);
});
