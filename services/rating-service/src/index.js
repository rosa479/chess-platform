require('dotenv').config();
const express = require('express');
const { createClient } = require('redis');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());
// Rating service port (per currWorking.md it runs on 3002)
const PORT = process.env.PORT || 3002;

// Redis client
const redisClient = createClient({ url: process.env.REDIS_URL });
redisClient.on('error', (err) => console.log('Redis Client Error', err));

// Connect to Redis
(async () => {
    try {
        await redisClient.connect();
        console.log('Connected to Redis for rating service');
    } catch (err) {
        console.error('Failed to connect to Redis:', err);
        process.exit(1);
    }
})();

// Glicko-2 constants
const TAU = 0.0833; // System constant
const EPSILON = 0.000001; // Convergence tolerance

// Glicko-2 rating system implementation
class Glicko2Rating {
    constructor(rating = 1500, ratingDeviation = 350, volatility = 0.06) {
        this.rating = rating;
        this.ratingDeviation = ratingDeviation;
        this.volatility = volatility;
    }
    
    // Convert to Glicko-2 scale
    toGlicko2() {
        return {
            mu: (this.rating - 1500) / 173.7178,
            phi: this.ratingDeviation / 173.7178,
            sigma: this.volatility
        };
    }
    
    // Convert from Glicko-2 scale
    fromGlicko2(mu, phi, sigma) {
        this.rating = 173.7178 * mu + 1500;
        this.ratingDeviation = 173.7178 * phi;
        this.volatility = sigma;
    }
    
    // Calculate expected score against another player
    expectedScore(opponent) {
        const g = 1 / Math.sqrt(1 + 3 * Math.pow(opponent.phi, 2) / Math.pow(Math.PI, 2));
        return 1 / (1 + Math.exp(-g * (this.mu - opponent.mu)));
    }
    
    // Update rating after games
    updateRating(opponents, results) {
        const glicko2 = this.toGlicko2();
        const mu = glicko2.mu;
        const phi = glicko2.phi;
        const sigma = glicko2.sigma;
        
        // Calculate v (variance)
        let v = 0;
        let delta = 0;
        
        for (let i = 0; i < opponents.length; i++) {
            const opponent = opponents[i].toGlicko2();
            const g = 1 / Math.sqrt(1 + 3 * Math.pow(opponent.phi, 2) / Math.pow(Math.PI, 2));
            const E = 1 / (1 + Math.exp(-g * (mu - opponent.mu)));
            
            v += Math.pow(g, 2) * E * (1 - E);
            delta += g * (results[i] - E);
        }
        
        v = 1 / v;
        delta *= v;
        
        // Update volatility
        const a = Math.log(Math.pow(sigma, 2));
        const f = (x) => {
            const ex = Math.exp(x);
            const newPhi = Math.sqrt(Math.pow(phi, 2) + ex);
            const newMu = mu + Math.pow(newPhi, 2) * delta;
            
            const g = 1 / Math.sqrt(1 + 3 * Math.pow(newPhi, 2) / Math.pow(Math.PI, 2));
            let sum = 0;
            
            for (let i = 0; i < opponents.length; i++) {
                const opponent = opponents[i].toGlicko2();
                const E = 1 / (1 + Math.exp(-g * (newMu - opponent.mu)));
                sum += Math.pow(g, 2) * E * (1 - E);
            }
            
            const newV = 1 / sum;
            const newDelta = delta * newV;
            
            return (Math.exp(x) * (Math.pow(newDelta, 2) - Math.pow(newPhi, 2) - newV - Math.exp(x))) / 
                   (2 * Math.pow(Math.pow(newPhi, 2) + newV + Math.exp(x), 2)) - 
                   (x - a) / Math.pow(TAU, 2);
        };
        
        let A = a;
        let B = 0;
        
        if (Math.pow(delta, 2) > Math.pow(phi, 2) + v) {
            B = Math.log(Math.pow(delta, 2) - Math.pow(phi, 2) - v);
        } else {
            let k = 1;
            while (f(a - k * TAU) < 0) {
                k++;
            }
            B = a - k * TAU;
        }
        
        let fA = f(A);
        let fB = f(B);
        
        while (Math.abs(B - A) > EPSILON) {
            const C = A + (A - B) * fA / (fB - fA);
            const fC = f(C);
            
            if (fC * fB < 0) {
                A = B;
                fA = fB;
            } else {
                fA /= 2;
            }
            
            B = C;
            fB = fC;
        }
        
        const newSigma = Math.exp(A / 2);
        
        // Update phi
        const newPhi = Math.sqrt(Math.pow(phi, 2) + Math.pow(newSigma, 2));
        
        // Update mu
        const newMu = mu + Math.pow(newPhi, 2) * delta;
        
        // Convert back to Glicko scale
        this.fromGlicko2(newMu, newPhi, newSigma);
    }
}

// Get user rating
app.get('/ratings/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { timeControl } = req.query;
        
        const ratingKey = timeControl ? `rating:${userId}:${timeControl}` : `rating:${userId}:overall`;
        const ratingData = await redisClient.get(ratingKey);
        
        if (!ratingData) {
            // Return default rating
            const defaultRating = new Glicko2Rating(1500, 350, 0.06);
            return res.json({
                userId,
                timeControl: timeControl || 'overall',
                rating: defaultRating.rating,
                ratingDeviation: defaultRating.ratingDeviation,
                volatility: defaultRating.volatility,
                gamesPlayed: 0,
                lastUpdated: new Date().toISOString()
            });
        }
        
        const rating = JSON.parse(ratingData);
        res.json(rating);
    } catch (error) {
        console.error('Get rating error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update ratings after game
app.post('/ratings/update', async (req, res) => {
    try {
        const { gameId, whitePlayerId, blackPlayerId, result, timeControl } = req.body;
        
        if (!whitePlayerId || !blackPlayerId || result === undefined) {
            return res.status(400).json({ error: 'Player IDs and result are required' });
        }
        
        // Get current ratings
        const whiteRatingKey = `rating:${whitePlayerId}:${timeControl || 'overall'}`;
        const blackRatingKey = `rating:${blackPlayerId}:${timeControl || 'overall'}`;
        
        let whiteRatingData = await redisClient.get(whiteRatingKey);
        let blackRatingData = await redisClient.get(blackRatingKey);
        
        const whiteRating = whiteRatingData ? 
            JSON.parse(whiteRatingData) : 
            new Glicko2Rating(1500, 350, 0.06);
        const blackRating = blackRatingData ? 
            JSON.parse(blackRatingData) : 
            new Glicko2Rating(1500, 350, 0.06);
        
        // Convert to Glicko2Rating objects
        const whiteGlicko = new Glicko2Rating(whiteRating.rating, whiteRating.ratingDeviation, whiteRating.volatility);
        const blackGlicko = new Glicko2Rating(blackRating.rating, blackRating.ratingDeviation, blackRating.volatility);
        
        // Determine results (1 = win, 0.5 = draw, 0 = loss)
        let whiteResult, blackResult;
        if (result === 'white') {
            whiteResult = 1;
            blackResult = 0;
        } else if (result === 'black') {
            whiteResult = 0;
            blackResult = 1;
        } else {
            whiteResult = 0.5;
            blackResult = 0.5;
        }
        
        // Update ratings
        whiteGlicko.updateRating([blackGlicko], [whiteResult]);
        blackGlicko.updateRating([whiteGlicko], [blackResult]);
        
        // Save updated ratings
        const updatedWhiteRating = {
            userId: whitePlayerId,
            timeControl: timeControl || 'overall',
            rating: Math.round(whiteGlicko.rating),
            ratingDeviation: Math.round(whiteGlicko.ratingDeviation),
            volatility: whiteGlicko.volatility,
            gamesPlayed: (whiteRating.gamesPlayed || 0) + 1,
            lastUpdated: new Date().toISOString()
        };
        
        const updatedBlackRating = {
            userId: blackPlayerId,
            timeControl: timeControl || 'overall',
            rating: Math.round(blackGlicko.rating),
            ratingDeviation: Math.round(blackGlicko.ratingDeviation),
            volatility: blackGlicko.volatility,
            gamesPlayed: (blackRating.gamesPlayed || 0) + 1,
            lastUpdated: new Date().toISOString()
        };
        
        await redisClient.set(whiteRatingKey, JSON.stringify(updatedWhiteRating));
        await redisClient.set(blackRatingKey, JSON.stringify(updatedBlackRating));
        
        // Update leaderboards
        await updateLeaderboard(whitePlayerId, updatedWhiteRating.rating, timeControl);
        await updateLeaderboard(blackPlayerId, updatedBlackRating.rating, timeControl);
        
        res.json({
            whiteRating: updatedWhiteRating,
            blackRating: updatedBlackRating,
            ratingChanges: {
                white: updatedWhiteRating.rating - (whiteRating.rating || 1500),
                black: updatedBlackRating.rating - (blackRating.rating || 1500)
            }
        });
    } catch (error) {
        console.error('Update rating error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get leaderboard for time control
app.get('/leaderboards/:timeControl', async (req, res) => {
    try {
        const { timeControl } = req.params;
        const { limit = 50 } = req.query;
        
        const leaderboardKey = `leaderboard:${timeControl}`;
        const playerIds = await redisClient.zRevRange(leaderboardKey, 0, parseInt(limit) - 1, 'WITHSCORES');
        
        const leaderboard = [];
        for (let i = 0; i < playerIds.length; i += 2) {
            const userId = playerIds[i];
            const rating = parseInt(playerIds[i + 1]);
            
            const userData = await redisClient.get(`user:${userId}`);
            if (userData) {
                const user = JSON.parse(userData);
                leaderboard.push({
                    userId,
                    username: user.username,
                    rating,
                    gamesPlayed: user.gamesPlayed || 0,
                    gamesWon: user.gamesWon || 0
                });
            }
        }
        
        res.json(leaderboard);
    } catch (error) {
        console.error('Get leaderboard error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get rating history
app.get('/ratings/:userId/history', async (req, res) => {
    try {
        const { userId } = req.params;
        const { timeControl, limit = 100 } = req.query;
        
        const historyKey = `rating_history:${userId}:${timeControl || 'overall'}`;
        const historyData = await redisClient.lRange(historyKey, 0, parseInt(limit) - 1);
        
        const history = historyData.map(entry => JSON.parse(entry));
        res.json(history);
    } catch (error) {
        console.error('Get rating history error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update leaderboard
async function updateLeaderboard(userId, rating, timeControl) {
    const leaderboardKey = `leaderboard:${timeControl || 'overall'}`;
    await redisClient.zAdd(leaderboardKey, { score: rating, value: userId });
}

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'rating-service' });
});

app.listen(PORT, () => {
    console.log(`Rating Service listening on port ${PORT}`);
});
