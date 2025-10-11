require('dotenv').config();
const express = require('express');
const { createClient } = require('redis');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3003;

// Redis client
const redisClient = createClient({ url: process.env.REDIS_URL });
redisClient.on('error', (err) => console.log('Redis Client Error', err));

// Connect to Redis
(async () => {
    try {
        await redisClient.connect();
        console.log('Connected to Redis for matchmaking service');
    } catch (err) {
        console.error('Failed to connect to Redis:', err);
        process.exit(1);
    }
})();

// Matchmaking queue - stores users waiting for a game
const matchmakingQueue = new Map();

// Time controls configuration
const TIME_CONTROLS = {
    'bullet': { initialMs: 60000, incrementMs: 0 }, // 1 minute
    'blitz': { initialMs: 300000, incrementMs: 0 }, // 5 minutes
    'rapid': { initialMs: 600000, incrementMs: 0 }, // 10 minutes
    'classical': { initialMs: 1800000, incrementMs: 0 }, // 30 minutes
    'bullet_increment': { initialMs: 120000, incrementMs: 1000 }, // 2+1
    'blitz_increment': { initialMs: 300000, incrementMs: 2000 }, // 5+2
    'rapid_increment': { initialMs: 600000, incrementMs: 5000 }, // 10+5
};

// Rating difference tolerance for matchmaking
const RATING_TOLERANCE = 200;
const MAX_WAIT_TIME = 30000; // 30 seconds

// Join matchmaking queue
app.post('/matchmaking/join', async (req, res) => {
    try {
        const { userId, timeControl, rating } = req.body;

        if (!userId || !timeControl || !rating) {
            return res.status(400).json({ error: 'userId, timeControl, and rating are required' });
        }

        if (!TIME_CONTROLS[timeControl]) {
            return res.status(400).json({ error: 'Invalid time control' });
        }

        // Check if user is already in queue
        if (matchmakingQueue.has(userId)) {
            return res.status(409).json({ error: 'User already in matchmaking queue' });
        }

        // Add user to queue
        const queueEntry = {
            userId,
            timeControl,
            rating,
            joinedAt: Date.now(),
            searchExpanded: false
        };

        matchmakingQueue.set(userId, queueEntry);

        // Try to find a match immediately
        const match = await findMatch(userId, timeControl, rating);
        if (match) {
            matchmakingQueue.delete(userId);
            matchmakingQueue.delete(match.opponentId);
            
            return res.json({
                message: 'Match found',
                gameId: match.gameId,
                opponent: match.opponent,
                timeControl: TIME_CONTROLS[timeControl]
            });
        }

        res.json({ message: 'Added to matchmaking queue', position: matchmakingQueue.size });

    } catch (error) {
        console.error('Join matchmaking error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Leave matchmaking queue
app.post('/matchmaking/leave', (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        const wasInQueue = matchmakingQueue.has(userId);
        matchmakingQueue.delete(userId);

        res.json({ 
            message: wasInQueue ? 'Left matchmaking queue' : 'Not in queue',
            success: wasInQueue
        });

    } catch (error) {
        console.error('Leave matchmaking error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get queue status
app.get('/matchmaking/status/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        const queueEntry = matchmakingQueue.get(userId);

        if (!queueEntry) {
            return res.json({ inQueue: false });
        }

        const waitTime = Date.now() - queueEntry.joinedAt;
        const queueSize = matchmakingQueue.size;

        res.json({
            inQueue: true,
            waitTime,
            queueSize,
            timeControl: queueEntry.timeControl,
            rating: queueEntry.rating
        });

    } catch (error) {
        console.error('Get queue status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all time controls
app.get('/matchmaking/time-controls', (req, res) => {
    res.json(TIME_CONTROLS);
});

// Find a match for a user
async function findMatch(userId, timeControl, rating) {
    const queueEntry = matchmakingQueue.get(userId);
    if (!queueEntry) return null;

    const currentTime = Date.now();
    const waitTime = currentTime - queueEntry.joinedAt;
    
    // Expand search tolerance if user has been waiting
    let tolerance = RATING_TOLERANCE;
    if (waitTime > MAX_WAIT_TIME / 2) {
        tolerance = RATING_TOLERANCE * 2;
    }
    if (waitTime > MAX_WAIT_TIME) {
        tolerance = RATING_TOLERANCE * 3;
    }

    // Find potential opponents
    for (const [opponentId, opponentEntry] of matchmakingQueue.entries()) {
        if (opponentId === userId) continue;
        if (opponentEntry.timeControl !== timeControl) continue;

        const ratingDiff = Math.abs(rating - opponentEntry.rating);
        if (ratingDiff <= tolerance) {
            // Found a match!
            const gameId = uuidv4();
            
            // Determine who plays white (random or higher rated)
            const whitePlayerId = Math.random() > 0.5 ? userId : opponentId;
            const blackPlayerId = whitePlayerId === userId ? opponentId : userId;

            // Create game via game-lifecycle-service
            try {
                const gameResponse = await fetch('http://localhost:3002/games', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        whitePlayerId,
                        blackPlayerId,
                        timeControl: TIME_CONTROLS[timeControl]
                    })
                });

                if (!gameResponse.ok) {
                    console.error('Failed to create game:', await gameResponse.text());
                    return null;
                }

                const gameData = await gameResponse.json();

                // Get opponent info from user service
                const opponentResponse = await fetch(`http://localhost:3001/users/${opponentId}`);
                const opponent = opponentResponse.ok ? await opponentResponse.json() : { userId: opponentId, username: 'Unknown' };

                return {
                    gameId: gameData.gameId,
                    opponentId,
                    opponent: {
                        userId: opponent.userId,
                        username: opponent.username,
                        rating: opponent.rating
                    },
                    timeControl: TIME_CONTROLS[timeControl]
                };

            } catch (error) {
                console.error('Error creating game:', error);
                return null;
            }
        }
    }

    return null;
}

// Periodic matchmaking check
setInterval(async () => {
    const currentTime = Date.now();
    
    for (const [userId, queueEntry] of matchmakingQueue.entries()) {
        const waitTime = currentTime - queueEntry.joinedAt;
        
        // Remove users who have been waiting too long
        if (waitTime > MAX_WAIT_TIME * 2) {
            console.log(`Removing user ${userId} from queue after ${waitTime}ms`);
            matchmakingQueue.delete(userId);
            continue;
        }

        // Try to find a match
        const match = await findMatch(userId, queueEntry.timeControl, queueEntry.rating);
        if (match) {
            console.log(`Match found: ${userId} vs ${match.opponentId}`);
            matchmakingQueue.delete(userId);
            matchmakingQueue.delete(match.opponentId);
            
            // Notify both players via WebSocket (this would be handled by the gateway)
            // For now, we'll just log it
        }
    }
}, 2000); // Check every 2 seconds

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        service: 'matchmaking-service',
        queueSize: matchmakingQueue.size
    });
});

app.listen(PORT, () => {
    console.log(`Matchmaking Service listening on port ${PORT}`);
});
