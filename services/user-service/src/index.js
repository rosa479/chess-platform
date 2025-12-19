require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const User = require('./models/User');

const app = express();
app.use(express.json());
// Basic CORS to allow the frontend (default Vite at 8080) to call this service
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || 'http://localhost:8080');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chess-users')
    .then(() => {
        console.log('Connected to MongoDB for user service');
    }).catch((error) => {
        console.error('Failed to connect to MongoDB:', error);
        process.exit(1);
    });

// User registration
app.post('/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Validate input
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password are required' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ $or: [ { username }, { email } ] });
        if (existingUser) {
            return res.status(409).json({ error: 'Username or email already exists' });
        }

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create user
        const userId = uuidv4();
        const user = new User({
            userId,
            username,
            email,
            password: hashedPassword,
            rating: 1200,
            gamesPlayed: 0,
            gamesWon: 0,
            isOnline: false,
        });
        await user.save();

        // Generate JWT token
        const token = jwt.sign(
            { userId, username, email },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        // Remove password from response
        const { password: _, ...userResponse } = user.toObject();
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

        // Get user from MongoDB
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update online status
        user.isOnline = true;
        await user.save();

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.userId, username: user.username, email: user.email },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        // Remove password from response
        const { password: _, ...userResponse } = user.toObject();

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
        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const { password: _, ...userResponse } = user.toObject();
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
        
        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const allowedUpdates = ['email', 'isOnline'];
        allowedUpdates.forEach(field => {
            if (updates[field] !== undefined) {
                user[field] = updates[field];
            }
        });
        await user.save();
        const { password: _, ...userResponse } = user.toObject();
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
        const { result, ratingChange } = req.body;

        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        user.gamesPlayed += 1;
        if (result === 'win') {
            user.gamesWon += 1;
        }
        user.rating += ratingChange || 0;
        await user.save();
        const { password: _, ...userResponse } = user.toObject();
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
        const users = await User.find({}, '-password').sort({ rating: -1 }).limit(Number(limit));
        res.json(users);
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

