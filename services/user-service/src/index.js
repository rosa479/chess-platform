require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { createClient } = require('redis');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Redis client for user data
const redisClient = createClient({ url: process.env.REDIS_URL });
redisClient.on('error', (err) => console.log('Redis Client Error', err));

// Connect to Redis
(async () => {
    try {
        await redisClient.connect();
        console.log('Connected to Redis for user service');
    } catch (err) {
        console.error('Failed to connect to Redis:', err);
        process.exit(1);
    }
})();

// User registration
app.post('/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Validate input
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password are required' });
        }

        // Check if user already exists
        const existingUser = await redisClient.get(`user:${username}`);
        if (existingUser) {
            return res.status(409).json({ error: 'Username already exists' });
        }

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create user object
        const userId = uuidv4();
        const user = {
            userId,
            username,
            email,
            password: hashedPassword,
            rating: 1200, // Default rating
            gamesPlayed: 0,
            gamesWon: 0,
            createdAt: new Date().toISOString(),
            isOnline: false
        };

        // Store user in Redis
        await redisClient.set(`user:${username}`, JSON.stringify(user));
        await redisClient.set(`user:${userId}`, JSON.stringify(user));

        // Generate JWT token
        const token = jwt.sign(
            { userId, username, email },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        // Remove password from response
        const { password: _, ...userResponse } = user;

        res.status(201).json({
            message: 'User created successfully',
            user: userResponse,
            token
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// User login
app.post('/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        // Get user from Redis
        const userData = await redisClient.get(`user:${username}`);
        if (!userData) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = JSON.parse(userData);

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update online status
        user.isOnline = true;
        await redisClient.set(`user:${username}`, JSON.stringify(user));
        await redisClient.set(`user:${user.userId}`, JSON.stringify(user));

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.userId, username: user.username, email: user.email },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        // Remove password from response
        const { password: _, ...userResponse } = user;

        res.json({
            message: 'Login successful',
            user: userResponse,
            token
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get user profile
app.get('/users/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const userData = await redisClient.get(`user:${userId}`);
        
        if (!userData) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = JSON.parse(userData);
        const { password: _, ...userResponse } = user;

        res.json(userResponse);
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update user profile
app.put('/users/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const updates = req.body;

        const userData = await redisClient.get(`user:${userId}`);
        if (!userData) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = JSON.parse(userData);
        
        // Update allowed fields
        const allowedUpdates = ['email', 'isOnline'];
        const updatedUser = { ...user };
        
        allowedUpdates.forEach(field => {
            if (updates[field] !== undefined) {
                updatedUser[field] = updates[field];
            }
        });

        // Save updated user
        await redisClient.set(`user:${user.username}`, JSON.stringify(updatedUser));
        await redisClient.set(`user:${userId}`, JSON.stringify(updatedUser));

        const { password: _, ...userResponse } = updatedUser;
        res.json(userResponse);

    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update user stats after game
app.post('/users/:userId/game-result', async (req, res) => {
    try {
        const { userId } = req.params;
        const { result, ratingChange } = req.body; // result: 'win', 'loss', 'draw'

        const userData = await redisClient.get(`user:${userId}`);
        if (!userData) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = JSON.parse(userData);
        
        // Update stats
        user.gamesPlayed += 1;
        if (result === 'win') {
            user.gamesWon += 1;
        }
        user.rating += ratingChange || 0;

        // Save updated user
        await redisClient.set(`user:${user.username}`, JSON.stringify(user));
        await redisClient.set(`user:${userId}`, JSON.stringify(user));

        const { password: _, ...userResponse } = user;
        res.json(userResponse);

    } catch (error) {
        console.error('Update game result error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get leaderboard
app.get('/leaderboard', async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        
        // Get all users (in a real app, you'd use a sorted set for better performance)
        const keys = await redisClient.keys('user:*');
        const users = [];

        for (const key of keys) {
            const userData = await redisClient.get(key);
            if (userData) {
                const user = JSON.parse(userData);
                // Skip if this is a username key (we want userId keys)
                if (user.userId) {
                    const { password: _, ...userResponse } = user;
                    users.push(userResponse);
                }
            }
        }

        // Sort by rating and limit
        users.sort((a, b) => b.rating - a.rating);
        const leaderboard = users.slice(0, parseInt(limit));

        res.json(leaderboard);

    } catch (error) {
        console.error('Get leaderboard error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'user-service' });
});

app.listen(PORT, () => {
    console.log(`User Service listening on port ${PORT}`);
});

