require('dotenv').config();
const express = require('express');
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');
const { Chess } = require('chess.js');

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3008;

// Redis client
const redisClient = new Redis({ host: 'redis', port: 6379, family: 4 });
redisClient.on('error', (err) => console.log('Redis Client Error', err));

// Connect to Redis
(async () => {
    try {
        await redisClient.connect();
        console.log('Connected to Redis for learning service');
    } catch (err) {
        console.error('Failed to connect to Redis:', err);
        process.exit(1);
    }
})();

// Learning topics
const LEARNING_TOPICS = {
    OPENING: {
        id: 'opening',
        name: 'Opening Principles',
        description: 'Learn the fundamental principles of chess openings',
        difficulty: 'beginner',
        lessons: [
            {
                id: 'opening_1',
                title: 'Control the Center',
                description: 'Learn why controlling the center is crucial in chess',
                fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
                moves: ['e4'],
                explanation: 'Playing e4 controls the center squares d5 and f5, and opens lines for your pieces.'
            },
            {
                id: 'opening_2',
                title: 'Develop Your Pieces',
                description: 'Get your pieces into the game quickly and efficiently',
                fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
                moves: ['Nf3'],
                explanation: 'Nf3 develops the knight toward the center and prepares to castle kingside.'
            }
        ]
    },
    TACTICS: {
        id: 'tactics',
        name: 'Basic Tactics',
        description: 'Master essential tactical patterns',
        difficulty: 'intermediate',
        lessons: [
            {
                id: 'tactics_1',
                title: 'The Fork',
                description: 'Attack two pieces at once with a single move',
                fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 4 4',
                moves: ['Bxf7+'],
                explanation: 'Bxf7+ forks the king and rook. Black must move the king, losing the rook.'
            },
            {
                id: 'tactics_2',
                title: 'The Pin',
                description: 'Immobilize an opponent\'s piece',
                fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 4 4',
                moves: ['Bxf7+'],
                explanation: 'The bishop pins the knight to the king, making it unable to move.'
            }
        ]
    },
    ENDGAME: {
        id: 'endgame',
        name: 'Endgame Fundamentals',
        description: 'Learn essential endgame techniques',
        difficulty: 'advanced',
        lessons: [
            {
                id: 'endgame_1',
                title: 'King and Pawn vs King',
                description: 'Learn to promote a pawn with king support',
                fen: '8/8/8/8/8/4k3/4P3/4K3 w - - 0 1',
                moves: ['Kd2'],
                explanation: 'The king must support the pawn\'s advance to promotion.'
            }
        ]
    },
    STRATEGY: {
        id: 'strategy',
        name: 'Strategic Concepts',
        description: 'Understand positional play and long-term planning',
        difficulty: 'advanced',
        lessons: [
            {
                id: 'strategy_1',
                title: 'Weak Squares',
                description: 'Identify and exploit weak squares in your opponent\'s position',
                fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 4 4',
                moves: ['Bxf7+'],
                explanation: 'The f7 square is weak because it\'s only defended by the king.'
            }
        ]
    }
};

// Video lessons (mock data)
const VIDEO_LESSONS = [
    {
        id: 'video_1',
        title: 'Chess Basics for Beginners',
        description: 'A comprehensive introduction to chess rules and basic strategies',
        duration: '45:30',
        thumbnail: '/videos/thumbnails/basics.jpg',
        url: '/videos/chess-basics.mp4',
        difficulty: 'beginner',
        topics: ['opening', 'tactics']
    },
    {
        id: 'video_2',
        title: 'Advanced Tactical Patterns',
        description: 'Learn complex tactical combinations and patterns',
        duration: '1:15:20',
        thumbnail: '/videos/thumbnails/tactics.jpg',
        url: '/videos/advanced-tactics.mp4',
        difficulty: 'intermediate',
        topics: ['tactics', 'strategy']
    },
    {
        id: 'video_3',
        title: 'Mastering the Endgame',
        description: 'Essential endgame techniques every player should know',
        duration: '1:30:45',
        thumbnail: '/videos/thumbnails/endgame.jpg',
        url: '/videos/endgame-mastery.mp4',
        difficulty: 'advanced',
        topics: ['endgame', 'strategy']
    }
];

// Get all learning topics
app.get('/topics', (req, res) => {
    res.json(Object.values(LEARNING_TOPICS));
});

// Get lessons for a specific topic
app.get('/topics/:topicId/lessons', (req, res) => {
    const { topicId } = req.params;
    const topic = LEARNING_TOPICS[topicId];
    
    if (!topic) {
        return res.status(404).json({ error: 'Topic not found' });
    }
    
    res.json(topic.lessons);
});

// Get specific lesson
app.get('/lessons/:lessonId', (req, res) => {
    const { lessonId } = req.params;
    
    for (const topic of Object.values(LEARNING_TOPICS)) {
        const lesson = topic.lessons.find(l => l.id === lessonId);
        if (lesson) {
            return res.json({ ...lesson, topic: topic.name });
        }
    }
    
    res.status(404).json({ error: 'Lesson not found' });
});

// Submit lesson solution
app.post('/lessons/:lessonId/solve', async (req, res) => {
    try {
        const { lessonId } = req.params;
        const { userId, move, timeSpent } = req.body;
        
        if (!userId || !move) {
            return res.status(400).json({ error: 'User ID and move are required' });
        }
        
        // Find the lesson
        let lesson = null;
        let topic = null;
        
        for (const t of Object.values(LEARNING_TOPICS)) {
            const l = t.lessons.find(l => l.id === lessonId);
            if (l) {
                lesson = l;
                topic = t;
                break;
            }
        }
        
        if (!lesson) {
            return res.status(404).json({ error: 'Lesson not found' });
        }
        
        const isCorrect = lesson.moves.includes(move);
        
        // Update user progress
        const progressKey = `user_learning_progress:${userId}`;
        let progress = await redisClient.get(progressKey);
        
        if (!progress) {
            progress = {
                userId,
                completedLessons: [],
                topicProgress: {},
                totalLessonsCompleted: 0,
                averageTime: 0,
                streak: 0
            };
        } else {
            progress = JSON.parse(progress);
        }
        
        // Update progress
        if (isCorrect && !progress.completedLessons.includes(lessonId)) {
            progress.completedLessons.push(lessonId);
            progress.totalLessonsCompleted++;
            
            // Update topic progress
            if (!progress.topicProgress[topic.id]) {
                progress.topicProgress[topic.id] = {
                    completed: 0,
                    total: topic.lessons.length
                };
            }
            progress.topicProgress[topic.id].completed++;
            
            // Update streak
            progress.streak++;
        } else if (!isCorrect) {
            progress.streak = 0;
        }
        
        // Update average time
        if (timeSpent) {
            progress.averageTime = (progress.averageTime * (progress.totalLessonsCompleted - 1) + timeSpent) / progress.totalLessonsCompleted;
        }
        
        await redisClient.set(progressKey, JSON.stringify(progress));
        
        res.json({
            correct: isCorrect,
            explanation: lesson.explanation,
            progress,
            completed: isCorrect && !progress.completedLessons.includes(lessonId)
        });
    } catch (error) {
        console.error('Solve lesson error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get user learning progress
app.get('/progress/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const progressKey = `user_learning_progress:${userId}`;
        const progress = await redisClient.get(progressKey);
        
        if (!progress) {
            return res.json({
                userId,
                completedLessons: [],
                topicProgress: {},
                totalLessonsCompleted: 0,
                averageTime: 0,
                streak: 0
            });
        }
        
        res.json(JSON.parse(progress));
    } catch (error) {
        console.error('Get progress error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get video lessons
app.get('/videos', (req, res) => {
    const { difficulty, topic } = req.query;
    
    let videos = VIDEO_LESSONS;
    
    if (difficulty) {
        videos = videos.filter(v => v.difficulty === difficulty);
    }
    
    if (topic) {
        videos = videos.filter(v => v.topics.includes(topic));
    }
    
    res.json(videos);
});

// Get specific video lesson
app.get('/videos/:videoId', (req, res) => {
    const { videoId } = req.params;
    const video = VIDEO_LESSONS.find(v => v.id === videoId);
    
    if (!video) {
        return res.status(404).json({ error: 'Video not found' });
    }
    
    res.json(video);
});

// Track video watching progress
app.post('/videos/:videoId/watch', async (req, res) => {
    try {
        const { videoId } = req.params;
        const { userId, watchTime, completed } = req.body;
        
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }
        
        const video = VIDEO_LESSONS.find(v => v.id === videoId);
        if (!video) {
            return res.status(404).json({ error: 'Video not found' });
        }
        
        // Track watching progress
        const watchKey = `user_video_progress:${userId}`;
        let watchProgress = await redisClient.get(watchKey);
        
        if (!watchProgress) {
            watchProgress = {
                userId,
                watchedVideos: [],
                totalWatchTime: 0,
                completedVideos: []
            };
        } else {
            watchProgress = JSON.parse(watchProgress);
        }
        
        // Update progress
        if (!watchProgress.watchedVideos.includes(videoId)) {
            watchProgress.watchedVideos.push(videoId);
        }
        
        if (watchTime) {
            watchProgress.totalWatchTime += watchTime;
        }
        
        if (completed && !watchProgress.completedVideos.includes(videoId)) {
            watchProgress.completedVideos.push(videoId);
        }
        
        await redisClient.set(watchKey, JSON.stringify(watchProgress));
        
        res.json({ message: 'Progress updated', watchProgress });
    } catch (error) {
        console.error('Track video watch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get user video progress
app.get('/videos/progress/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const watchKey = `user_video_progress:${userId}`;
        const watchProgress = await redisClient.get(watchKey);
        
        if (!watchProgress) {
            return res.json({
                userId,
                watchedVideos: [],
                totalWatchTime: 0,
                completedVideos: []
            });
        }
        
        res.json(JSON.parse(watchProgress));
    } catch (error) {
        console.error('Get video progress error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'learning-service' });
});

app.listen(PORT, () => {
    console.log(`Learning Service listening on port ${PORT}`);
});
