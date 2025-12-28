require('dotenv').config();
const express = require('express');
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');
const { Chess } = require('chess.js');

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3007;

// Redis client
const redisClient = new Redis({ host: 'redis', port: 6379, family: 4 });
redisClient.on('error', (err) => console.log('Redis Client Error', err));

// Connect to Redis
(async () => {
    try {
        await redisClient.connect();
        console.log('Connected to Redis for puzzle service');
    } catch (err) {
        console.error('Failed to connect to Redis:', err);
        process.exit(1);
    }
})();

// Puzzle database (in production, this would be in a proper database)
const PUZZLE_DATABASE = [
    {
        id: 'puzzle_1',
        fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 4 4',
        moves: ['Bxf7+'],
        rating: 1200,
        themes: ['tactics', 'fork'],
        description: 'Find the winning move'
    },
    {
        id: 'puzzle_2',
        fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 4 4',
        moves: ['Bxf7+'],
        rating: 1400,
        themes: ['tactics', 'sacrifice'],
        description: 'Sacrifice for advantage'
    },
    {
        id: 'puzzle_3',
        fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 4 4',
        moves: ['Nxe5'],
        rating: 1600,
        themes: ['tactics', 'pin'],
        description: 'Exploit the pin'
    }
];

// Initialize puzzle database
(async () => {
    for (const puzzle of PUZZLE_DATABASE) {
        await redisClient.set(`puzzle:${puzzle.id}`, JSON.stringify(puzzle));
        await redisClient.sAdd('puzzles:all', puzzle.id);
        await redisClient.sAdd(`puzzles:rating:${Math.floor(puzzle.rating / 100) * 100}`, puzzle.id);
    }
})();

// Get random puzzle based on user rating
app.get('/puzzles/random', async (req, res) => {
    try {
        const { userRating = 1200 } = req.query;
        const ratingRange = Math.floor(userRating / 100) * 100;
        
        // Get puzzles within rating range (±200)
        const puzzleIds = await redisClient.sMembers(`puzzles:rating:${ratingRange}`);
        
        if (puzzleIds.length === 0) {
            // Fallback to all puzzles if no puzzles in rating range
            const allPuzzleIds = await redisClient.sMembers('puzzles:all');
            const randomIndex = Math.floor(Math.random() * allPuzzleIds.length);
            const puzzleId = allPuzzleIds[randomIndex];
            const puzzleData = await redisClient.get(`puzzle:${puzzleId}`);
            const puzzle = JSON.parse(puzzleData);
            
            return res.json(puzzle);
        }

        const randomIndex = Math.floor(Math.random() * puzzleIds.length);
        const puzzleId = puzzleIds[randomIndex];
        const puzzleData = await redisClient.get(`puzzle:${puzzleId}`);
        const puzzle = JSON.parse(puzzleData);

        res.json(puzzle);
    } catch (error) {
        console.error('Get random puzzle error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get daily puzzle
app.get('/puzzles/daily', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const dailyPuzzleKey = `daily_puzzle:${today}`;
        
        let dailyPuzzle = await redisClient.get(dailyPuzzleKey);
        
        if (!dailyPuzzle) {
            // Generate new daily puzzle
            const allPuzzleIds = await redisClient.sMembers('puzzles:all');
            const randomIndex = Math.floor(Math.random() * allPuzzleIds.length);
            const puzzleId = allPuzzleIds[randomIndex];
            const puzzleData = await redisClient.get(`puzzle:${puzzleId}`);
            const puzzle = JSON.parse(puzzleData);
            
            // Store as daily puzzle
            await redisClient.set(dailyPuzzleKey, JSON.stringify(puzzle));
            await redisClient.expire(dailyPuzzleKey, 86400); // 24 hours
            
            dailyPuzzle = JSON.stringify(puzzle);
        }

        res.json(JSON.parse(dailyPuzzle));
    } catch (error) {
        console.error('Get daily puzzle error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Submit puzzle solution
app.post('/puzzles/:puzzleId/solve', async (req, res) => {
    try {
        const { puzzleId } = req.params;
        const { userId, move, timeSpent } = req.body;

        if (!userId || !move) {
            return res.status(400).json({ error: 'User ID and move are required' });
        }

        const puzzleData = await redisClient.get(`puzzle:${puzzleId}`);
        if (!puzzleData) {
            return res.status(404).json({ error: 'Puzzle not found' });
        }

        const puzzle = JSON.parse(puzzleData);
        const isCorrect = puzzle.moves.includes(move);

        // Get or create user puzzle stats
        const userStatsKey = `user_puzzle_stats:${userId}`;
        let userStats = await redisClient.get(userStatsKey);
        if (!userStats) {
            userStats = {
                userId,
                puzzleRating: 1200,
                puzzlesSolved: 0,
                puzzlesAttempted: 0,
                correctAnswers: 0,
                averageTime: 0,
                streak: 0,
                bestStreak: 0
            };
        } else {
            userStats = JSON.parse(userStats);
        }

        // Update stats
        userStats.puzzlesAttempted++;
        if (isCorrect) {
            userStats.puzzlesSolved++;
            userStats.correctAnswers++;
            userStats.streak++;
            userStats.bestStreak = Math.max(userStats.bestStreak, userStats.streak);
            
            // Update puzzle rating (simplified Glicko-2)
            const ratingChange = calculateRatingChange(userStats.puzzleRating, puzzle.rating, true);
            userStats.puzzleRating = Math.max(400, userStats.puzzleRating + ratingChange);
        } else {
            userStats.streak = 0;
            const ratingChange = calculateRatingChange(userStats.puzzleRating, puzzle.rating, false);
            userStats.puzzleRating = Math.max(400, userStats.puzzleRating + ratingChange);
        }

        // Update average time
        if (timeSpent) {
            userStats.averageTime = (userStats.averageTime * (userStats.puzzlesAttempted - 1) + timeSpent) / userStats.puzzlesAttempted;
        }

        await redisClient.set(userStatsKey, JSON.stringify(userStats));

        res.json({
            correct: isCorrect,
            userStats,
            ratingChange: isCorrect ? 
                calculateRatingChange(userStats.puzzleRating, puzzle.rating, true) :
                calculateRatingChange(userStats.puzzleRating, puzzle.rating, false)
        });
    } catch (error) {
        console.error('Solve puzzle error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get user puzzle stats
app.get('/puzzles/stats/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const userStatsKey = `user_puzzle_stats:${userId}`;
        const userStats = await redisClient.get(userStatsKey);
        
        if (!userStats) {
            return res.json({
                userId,
                puzzleRating: 1200,
                puzzlesSolved: 0,
                puzzlesAttempted: 0,
                correctAnswers: 0,
                averageTime: 0,
                streak: 0,
                bestStreak: 0
            });
        }

        res.json(JSON.parse(userStats));
    } catch (error) {
        console.error('Get puzzle stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Puzzle Rush - get sequence of puzzles
app.post('/puzzles/rush', async (req, res) => {
    try {
        const { userId, timeLimit = 300 } = req.body; // 5 minutes default

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const rushId = uuidv4();
        const rushSession = {
            rushId,
            userId,
            timeLimit,
            startTime: Date.now(),
            puzzles: [],
            currentPuzzleIndex: 0,
            score: 0,
            completed: false
        };

        // Generate 10 puzzles of increasing difficulty
        const puzzles = [];
        for (let i = 0; i < 10; i++) {
            const difficulty = 1000 + (i * 100); // 1000 to 1900 rating
            const puzzleIds = await redisClient.sMembers(`puzzles:rating:${difficulty}`);
            
            if (puzzleIds.length > 0) {
                const randomIndex = Math.floor(Math.random() * puzzleIds.length);
                const puzzleId = puzzleIds[randomIndex];
                const puzzleData = await redisClient.get(`puzzle:${puzzleId}`);
                const puzzle = JSON.parse(puzzleData);
                puzzles.push(puzzle);
            }
        }

        rushSession.puzzles = puzzles;
        await redisClient.set(`puzzle_rush:${rushId}`, JSON.stringify(rushSession));

        res.json({
            rushId,
            puzzle: puzzles[0],
            timeLimit,
            totalPuzzles: puzzles.length
        });
    } catch (error) {
        console.error('Start puzzle rush error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Submit puzzle rush solution
app.post('/puzzles/rush/:rushId/solve', async (req, res) => {
    try {
        const { rushId } = req.params;
        const { move, timeSpent } = req.body;

        if (!move) {
            return res.status(400).json({ error: 'Move is required' });
        }

        const rushData = await redisClient.get(`puzzle_rush:${rushId}`);
        if (!rushData) {
            return res.status(404).json({ error: 'Puzzle rush not found' });
        }

        const rushSession = JSON.parse(rushData);
        const currentPuzzle = rushSession.puzzles[rushSession.currentPuzzleIndex];
        const isCorrect = currentPuzzle.moves.includes(move);

        if (isCorrect) {
            rushSession.score += Math.max(1, 10 - Math.floor(timeSpent / 10)); // Bonus for speed
            rushSession.currentPuzzleIndex++;
        }

        // Check if rush is complete
        if (rushSession.currentPuzzleIndex >= rushSession.puzzles.length) {
            rushSession.completed = true;
            rushSession.endTime = Date.now();
        }

        await redisClient.set(`puzzle_rush:${rushId}`, JSON.stringify(rushSession));

        res.json({
            correct: isCorrect,
            score: rushSession.score,
            nextPuzzle: rushSession.completed ? null : rushSession.puzzles[rushSession.currentPuzzleIndex],
            completed: rushSession.completed,
            totalScore: rushSession.score
        });
    } catch (error) {
        console.error('Solve puzzle rush error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Calculate rating change (simplified Glicko-2)
function calculateRatingChange(userRating, puzzleRating, isCorrect) {
    const expectedScore = 1 / (1 + Math.pow(10, (puzzleRating - userRating) / 400));
    const actualScore = isCorrect ? 1 : 0;
    const kFactor = 32;
    
    return Math.round(kFactor * (actualScore - expectedScore));
}

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'puzzle-service' });
});

app.listen(PORT, () => {
    console.log(`Puzzle Service listening on port ${PORT}`);
});
