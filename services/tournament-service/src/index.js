require('dotenv').config();
const express = require('express');
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');
const { Chess } = require('chess.js');

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3005;

// Redis client
const redisClient = new Redis({ host: 'redis', port: 6379, family: 4 });
redisClient.on('error', (err) => console.log('Redis Client Error', err));

// Connect to Redis
(async () => {
    try {
        await redisClient.connect();
        console.log('Connected to Redis for tournament service');
    } catch (err) {
        console.error('Failed to connect to Redis:', err);
        process.exit(1);
    }
})();

// Tournament types
const TOURNAMENT_TYPES = {
    SWISS: 'swiss',
    ARENA: 'arena'
};

// Tournament status
const TOURNAMENT_STATUS = {
    REGISTRATION: 'registration',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
};

// Create tournament
app.post('/tournaments', async (req, res) => {
    try {
        const {
            name,
            type,
            timeControl,
            maxParticipants,
            rounds,
            startTime,
            registrationDeadline
        } = req.body;

        if (!name || !type || !timeControl) {
            return res.status(400).json({ error: 'Name, type, and time control are required' });
        }

        if (!Object.values(TOURNAMENT_TYPES).includes(type)) {
            return res.status(400).json({ error: 'Invalid tournament type' });
        }

        const tournamentId = uuidv4();
        const tournament = {
            tournamentId,
            name,
            type,
            timeControl,
            maxParticipants: maxParticipants || (type === TOURNAMENT_TYPES.SWISS ? 32 : 100),
            rounds: rounds || (type === TOURNAMENT_TYPES.SWISS ? 5 : null),
            startTime: startTime || new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
            registrationDeadline: registrationDeadline || new Date(Date.now() + 1800000).toISOString(), // 30 minutes from now
            status: TOURNAMENT_STATUS.REGISTRATION,
            participants: [],
            games: [],
            standings: [],
            createdAt: new Date().toISOString(),
            createdBy: req.body.createdBy
        };

        await redisClient.set(`tournament:${tournamentId}`, JSON.stringify(tournament));
        await redisClient.sAdd('tournaments:active', tournamentId);

        res.status(201).json(tournament);
    } catch (error) {
        console.error('Create tournament error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Join tournament
app.post('/tournaments/:tournamentId/join', async (req, res) => {
    try {
        const { tournamentId } = req.params;
        const { userId, username, rating } = req.body;

        if (!userId || !username || !rating) {
            return res.status(400).json({ error: 'User ID, username, and rating are required' });
        }

        const tournamentData = await redisClient.get(`tournament:${tournamentId}`);
        if (!tournamentData) {
            return res.status(404).json({ error: 'Tournament not found' });
        }

        const tournament = JSON.parse(tournamentData);

        if (tournament.status !== TOURNAMENT_STATUS.REGISTRATION) {
            return res.status(400).json({ error: 'Tournament registration is closed' });
        }

        if (tournament.participants.length >= tournament.maxParticipants) {
            return res.status(400).json({ error: 'Tournament is full' });
        }

        // Check if user is already registered
        const existingParticipant = tournament.participants.find(p => p.userId === userId);
        if (existingParticipant) {
            return res.status(400).json({ error: 'Already registered for this tournament' });
        }

        // Add participant
        const participant = {
            userId,
            username,
            rating,
            score: 0,
            gamesPlayed: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            opponents: []
        };

        tournament.participants.push(participant);
        await redisClient.set(`tournament:${tournamentId}`, JSON.stringify(tournament));

        res.json({ message: 'Successfully joined tournament', participant });
    } catch (error) {
        console.error('Join tournament error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Leave tournament
app.post('/tournaments/:tournamentId/leave', async (req, res) => {
    try {
        const { tournamentId } = req.params;
        const { userId } = req.body;

        const tournamentData = await redisClient.get(`tournament:${tournamentId}`);
        if (!tournamentData) {
            return res.status(404).json({ error: 'Tournament not found' });
        }

        const tournament = JSON.parse(tournamentData);

        if (tournament.status !== TOURNAMENT_STATUS.REGISTRATION) {
            return res.status(400).json({ error: 'Cannot leave tournament after registration closes' });
        }

        tournament.participants = tournament.participants.filter(p => p.userId !== userId);
        await redisClient.set(`tournament:${tournamentId}`, JSON.stringify(tournament));

        res.json({ message: 'Successfully left tournament' });
    } catch (error) {
        console.error('Leave tournament error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start tournament
app.post('/tournaments/:tournamentId/start', async (req, res) => {
    try {
        const { tournamentId } = req.params;

        const tournamentData = await redisClient.get(`tournament:${tournamentId}`);
        if (!tournamentData) {
            return res.status(404).json({ error: 'Tournament not found' });
        }

        const tournament = JSON.parse(tournamentData);

        if (tournament.status !== TOURNAMENT_STATUS.REGISTRATION) {
            return res.status(400).json({ error: 'Tournament cannot be started' });
        }

        if (tournament.participants.length < 2) {
            return res.status(400).json({ error: 'Need at least 2 participants' });
        }

        tournament.status = TOURNAMENT_STATUS.IN_PROGRESS;
        tournament.startedAt = new Date().toISOString();

        if (tournament.type === TOURNAMENT_TYPES.SWISS) {
            await startSwissTournament(tournament);
        } else if (tournament.type === TOURNAMENT_TYPES.ARENA) {
            await startArenaTournament(tournament);
        }

        await redisClient.set(`tournament:${tournamentId}`, JSON.stringify(tournament));

        res.json({ message: 'Tournament started', tournament });
    } catch (error) {
        console.error('Start tournament error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get tournament details
app.get('/tournaments/:tournamentId', async (req, res) => {
    try {
        const { tournamentId } = req.params;

        const tournamentData = await redisClient.get(`tournament:${tournamentId}`);
        if (!tournamentData) {
            return res.status(404).json({ error: 'Tournament not found' });
        }

        const tournament = JSON.parse(tournamentData);
        res.json(tournament);
    } catch (error) {
        console.error('Get tournament error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get active tournaments
app.get('/tournaments', async (req, res) => {
    try {
        const { status, type } = req.query;
        
        const tournamentIds = await redisClient.sMembers('tournaments:active');
        const tournaments = [];

        for (const tournamentId of tournamentIds) {
            const tournamentData = await redisClient.get(`tournament:${tournamentId}`);
            if (tournamentData) {
                const tournament = JSON.parse(tournamentData);
                
                if ((!status || tournament.status === status) && 
                    (!type || tournament.type === type)) {
                    tournaments.push(tournament);
                }
            }
        }

        // Sort by creation date
        tournaments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json(tournaments);
    } catch (error) {
        console.error('Get tournaments error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Swiss tournament pairing algorithm
async function startSwissTournament(tournament) {
    const participants = [...tournament.participants];
    
    // Sort by rating for first round
    participants.sort((a, b) => b.rating - a.rating);
    
    // Create first round pairings
    const pairings = [];
    for (let i = 0; i < participants.length; i += 2) {
        if (i + 1 < participants.length) {
            pairings.push({
                white: participants[i],
                black: participants[i + 1],
                round: 1
            });
        } else {
            // Odd number of participants - bye for last player
            participants[i].score += 1; // Bye gives 1 point
        }
    }

    tournament.currentRound = 1;
    tournament.pairings = pairings;
}

// Arena tournament - continuous pairings
async function startArenaTournament(tournament) {
    tournament.currentRound = 1;
    tournament.pairings = [];
    
    // Start with random pairings for arena
    const participants = [...tournament.participants];
    shuffleArray(participants);
    
    const pairings = [];
    for (let i = 0; i < participants.length; i += 2) {
        if (i + 1 < participants.length) {
            pairings.push({
                white: participants[i],
                black: participants[i + 1],
                round: 1
            });
        }
    }

    tournament.pairings = pairings;
}

// Utility function to shuffle array
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'tournament-service' });
});

app.listen(PORT, () => {
    console.log(`Tournament Service listening on port ${PORT}`);
});
