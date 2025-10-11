require('dotenv').config();
const express = require('express');
const { createClient } = require('redis');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3010;

// Redis client
const redisClient = createClient({ url: process.env.REDIS_URL });
redisClient.on('error', (err) => console.log('Redis Client Error', err));

// Connect to Redis
(async () => {
    try {
        await redisClient.connect();
        console.log('Connected to Redis for community service');
    } catch (err) {
        console.error('Failed to connect to Redis:', err);
        process.exit(1);
    }
})();

// Get leaderboards for all time controls
app.get('/leaderboards', async (req, res) => {
    try {
        const { timeControl, limit = 50 } = req.query;
        
        const timeControls = timeControl ? [timeControl] : ['bullet', 'blitz', 'rapid', 'classical'];
        const leaderboards = {};
        
        for (const tc of timeControls) {
            const leaderboardKey = `leaderboard:${tc}`;
            const playerIds = await redisClient.zRevRange(leaderboardKey, 0, parseInt(limit) - 1, 'WITHSCORES');
            
            const players = [];
            for (let i = 0; i < playerIds.length; i += 2) {
                const userId = playerIds[i];
                const rating = parseInt(playerIds[i + 1]);
                
                const userData = await redisClient.get(`user:${userId}`);
                if (userData) {
                    const user = JSON.parse(userData);
                    players.push({
                        userId,
                        username: user.username,
                        rating,
                        gamesPlayed: user.gamesPlayed || 0,
                        gamesWon: user.gamesWon || 0
                    });
                }
            }
            
            leaderboards[tc] = players;
        }
        
        res.json(leaderboards);
    } catch (error) {
        console.error('Get leaderboards error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get specific leaderboard
app.get('/leaderboards/:timeControl', async (req, res) => {
    try {
        const { timeControl } = req.params;
        const { limit = 50 } = req.query;
        
        const leaderboardKey = `leaderboard:${timeControl}`;
        const playerIds = await redisClient.zRevRange(leaderboardKey, 0, parseInt(limit) - 1, 'WITHSCORES');
        
        const players = [];
        for (let i = 0; i < playerIds.length; i += 2) {
            const userId = playerIds[i];
            const rating = parseInt(playerIds[i + 1]);
            
            const userData = await redisClient.get(`user:${userId}`);
            if (userData) {
                const user = JSON.parse(userData);
                players.push({
                    userId,
                    username: user.username,
                    rating,
                    gamesPlayed: user.gamesPlayed || 0,
                    gamesWon: user.gamesWon || 0,
                    winRate: user.gamesPlayed > 0 ? Math.round((user.gamesWon / user.gamesPlayed) * 100) : 0
                });
            }
        }
        
        res.json(players);
    } catch (error) {
        console.error('Get leaderboard error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Submit feedback
app.post('/feedback', async (req, res) => {
    try {
        const { userId, type, subject, message, rating } = req.body;
        
        if (!type || !subject || !message) {
            return res.status(400).json({ error: 'Type, subject, and message are required' });
        }
        
        const feedbackId = uuidv4();
        const feedback = {
            feedbackId,
            userId: userId || 'anonymous',
            type, // 'bug', 'feature', 'general', 'complaint'
            subject,
            message,
            rating: rating || null,
            status: 'open',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        await redisClient.set(`feedback:${feedbackId}`, JSON.stringify(feedback));
        await redisClient.lPush('feedback:list', feedbackId);
        
        res.status(201).json({ 
            message: 'Feedback submitted successfully',
            feedbackId 
        });
    } catch (error) {
        console.error('Submit feedback error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get feedback (admin only)
app.get('/feedback', async (req, res) => {
    try {
        const { status, type, limit = 50 } = req.query;
        
        const feedbackIds = await redisClient.lRange('feedback:list', 0, parseInt(limit) - 1);
        const feedbackList = [];
        
        for (const feedbackId of feedbackIds) {
            const feedbackData = await redisClient.get(`feedback:${feedbackId}`);
            if (feedbackData) {
                const feedback = JSON.parse(feedbackData);
                
                if ((!status || feedback.status === status) && 
                    (!type || feedback.type === type)) {
                    feedbackList.push(feedback);
                }
            }
        }
        
        res.json(feedbackList);
    } catch (error) {
        console.error('Get feedback error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update feedback status (admin only)
app.put('/feedback/:feedbackId', async (req, res) => {
    try {
        const { feedbackId } = req.params;
        const { status, response } = req.body;
        
        const feedbackData = await redisClient.get(`feedback:${feedbackId}`);
        if (!feedbackData) {
            return res.status(404).json({ error: 'Feedback not found' });
        }
        
        const feedback = JSON.parse(feedbackData);
        feedback.status = status || feedback.status;
        feedback.response = response || feedback.response;
        feedback.updatedAt = new Date().toISOString();
        
        await redisClient.set(`feedback:${feedbackId}`, JSON.stringify(feedback));
        
        res.json(feedback);
    } catch (error) {
        console.error('Update feedback error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create announcement
app.post('/announcements', async (req, res) => {
    try {
        const { title, content, type, priority } = req.body;
        
        if (!title || !content) {
            return res.status(400).json({ error: 'Title and content are required' });
        }
        
        const announcementId = uuidv4();
        const announcement = {
            announcementId,
            title,
            content,
            type: type || 'general', // 'general', 'maintenance', 'tournament', 'update'
            priority: priority || 'normal', // 'low', 'normal', 'high', 'urgent'
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        await redisClient.set(`announcement:${announcementId}`, JSON.stringify(announcement));
        await redisClient.lPush('announcements:list', announcementId);
        
        res.status(201).json(announcement);
    } catch (error) {
        console.error('Create announcement error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get announcements
app.get('/announcements', async (req, res) => {
    try {
        const { type, priority, limit = 10 } = req.query;
        
        const announcementIds = await redisClient.lRange('announcements:list', 0, parseInt(limit) - 1);
        const announcements = [];
        
        for (const announcementId of announcementIds) {
            const announcementData = await redisClient.get(`announcement:${announcementId}`);
            if (announcementData) {
                const announcement = JSON.parse(announcementData);
                
                if (announcement.isActive &&
                    (!type || announcement.type === type) &&
                    (!priority || announcement.priority === priority)) {
                    announcements.push(announcement);
                }
            }
        }
        
        res.json(announcements);
    } catch (error) {
        console.error('Get announcements error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get specific announcement
app.get('/announcements/:announcementId', async (req, res) => {
    try {
        const { announcementId } = req.params;
        
        const announcementData = await redisClient.get(`announcement:${announcementId}`);
        if (!announcementData) {
            return res.status(404).json({ error: 'Announcement not found' });
        }
        
        const announcement = JSON.parse(announcementData);
        res.json(announcement);
    } catch (error) {
        console.error('Get announcement error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update announcement
app.put('/announcements/:announcementId', async (req, res) => {
    try {
        const { announcementId } = req.params;
        const { title, content, type, priority, isActive } = req.body;
        
        const announcementData = await redisClient.get(`announcement:${announcementId}`);
        if (!announcementData) {
            return res.status(404).json({ error: 'Announcement not found' });
        }
        
        const announcement = JSON.parse(announcementData);
        announcement.title = title || announcement.title;
        announcement.content = content || announcement.content;
        announcement.type = type || announcement.type;
        announcement.priority = priority || announcement.priority;
        announcement.isActive = isActive !== undefined ? isActive : announcement.isActive;
        announcement.updatedAt = new Date().toISOString();
        
        await redisClient.set(`announcement:${announcementId}`, JSON.stringify(announcement));
        
        res.json(announcement);
    } catch (error) {
        console.error('Update announcement error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get community stats
app.get('/stats', async (req, res) => {
    try {
        const stats = {
            totalUsers: 0,
            activeUsers: 0,
            totalGames: 0,
            ongoingGames: 0,
            totalTournaments: 0,
            activeTournaments: 0
        };
        
        // Count total users
        const userKeys = await redisClient.keys('user:*');
        stats.totalUsers = userKeys.length;
        
        // Count active users (online in last 24 hours)
        const activeUserKeys = await redisClient.keys('user_session:*');
        stats.activeUsers = activeUserKeys.length;
        
        // Count total games
        const gameKeys = await redisClient.keys('game:*');
        stats.totalGames = gameKeys.length;
        
        // Count ongoing games
        for (const key of gameKeys) {
            const gameData = await redisClient.get(key);
            if (gameData) {
                const game = JSON.parse(gameData);
                if (!game.isGameOver) {
                    stats.ongoingGames++;
                }
            }
        }
        
        // Count tournaments
        const tournamentKeys = await redisClient.keys('tournament:*');
        stats.totalTournaments = tournamentKeys.length;
        
        // Count active tournaments
        for (const key of tournamentKeys) {
            const tournamentData = await redisClient.get(key);
            if (tournamentData) {
                const tournament = JSON.parse(tournamentData);
                if (tournament.status === 'in_progress') {
                    stats.activeTournaments++;
                }
            }
        }
        
        res.json(stats);
    } catch (error) {
        console.error('Get community stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'community-service' });
});

app.listen(PORT, () => {
    console.log(`Community Service listening on port ${PORT}`);
});
