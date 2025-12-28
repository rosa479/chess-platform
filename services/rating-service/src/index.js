require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const Rating = require('./models/Rating');
const User = require('./models/User');

const app = express();
// app.use(cors({ origin: 'http://localhost:8080' }));
app.use(express.json());
// Rating service port (per currWorking.md it runs on 3002)
const PORT = process.env.PORT || 3002;

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongodb:27017/chess-rating')
    .then(() => {
        console.log('Connected to MongoDB for rating service');
    })
    .catch((error) => {
        console.error('Failed to connect to MongoDB:', error);
        process.exit(1);
    });

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
        const { timeControl = 'overall' } = req.query;

        let rating = await Rating.findOne({ userId, timeControl });
        if (!rating) {
            rating = new Glicko2Rating(1500, 350, 0.06);
            return res.json({
                userId,
                timeControl,
                rating: rating.rating,
                ratingDeviation: rating.ratingDeviation,
                volatility: rating.volatility,
                gamesPlayed: 0,
                lastUpdated: new Date().toISOString()
            });
        }
        res.json(rating);
    } catch (error) {
        console.error('Get rating error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update ratings after game
app.post('/ratings/update', async (req, res) => {
    try {
        const { gameId, whitePlayerId, blackPlayerId, result, timeControl = 'overall' } = req.body;

        if (!whitePlayerId || !blackPlayerId || result === undefined) {
            return res.status(400).json({ error: 'Player IDs and result are required' });
        }

        // Get or initialize ratings from MongoDB
        let whiteRatingDoc = await Rating.findOne({ userId: whitePlayerId, timeControl });
        let blackRatingDoc = await Rating.findOne({ userId: blackPlayerId, timeControl });
        const whiteBase = whiteRatingDoc || { rating: 1500, ratingDeviation: 350, volatility: 0.06, gamesPlayed: 0 };
        const blackBase = blackRatingDoc || { rating: 1500, ratingDeviation: 350, volatility: 0.06, gamesPlayed: 0 };
        
        const whiteGlicko = new Glicko2Rating(whiteBase.rating, whiteBase.ratingDeviation, whiteBase.volatility);
        const blackGlicko = new Glicko2Rating(blackBase.rating, blackBase.ratingDeviation, blackBase.volatility);

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

        // Save updated ratings to MongoDB (upsert)
        const updatedWhiteRating = {
            userId: whitePlayerId,
            timeControl,
            rating: Math.round(whiteGlicko.rating),
            ratingDeviation: Math.round(whiteGlicko.ratingDeviation),
            volatility: whiteGlicko.volatility,
            gamesPlayed: (whiteBase.gamesPlayed || 0) + 1,
            lastUpdated: new Date()
        };
        const updatedBlackRating = {
            userId: blackPlayerId,
            timeControl,
            rating: Math.round(blackGlicko.rating),
            ratingDeviation: Math.round(blackGlicko.ratingDeviation),
            volatility: blackGlicko.volatility,
            gamesPlayed: (blackBase.gamesPlayed || 0) + 1,
            lastUpdated: new Date()
        };

        await Rating.updateOne({ userId: whitePlayerId, timeControl }, updatedWhiteRating, { upsert: true });
        await Rating.updateOne({ userId: blackPlayerId, timeControl }, updatedBlackRating, { upsert: true });

        res.json({
            whiteRating: updatedWhiteRating,
            blackRating: updatedBlackRating,
            ratingChanges: {
                white: updatedWhiteRating.rating - (whiteBase.rating || 1500),
                black: updatedBlackRating.rating - (blackBase.rating || 1500)
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

        // Get Rating docs for this timeControl sorted by rating descending
        const ratings = await Rating.find({ timeControl })
            .sort({ rating: -1 })
            .limit(parseInt(limit));
            
        // Populate username from User collection
        const leaderboard = await Promise.all(ratings.map(async r => {
            const user = await User.findOne({ userId: r.userId });
            return {
                userId: r.userId,
                username: user ? user.username : undefined,
                rating: r.rating,
                gamesPlayed: r.gamesPlayed || 0
            };
        }));

        res.json(leaderboard);
    } catch (error) {
        console.error('Get leaderboard error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get rating history (returns last N rating documents for user+timeControl)
app.get('/ratings/:userId/history', async (req, res) => {
    try {
        const { userId } = req.params;
        const { timeControl = 'overall', limit = 100 } = req.query;
        
        // In the rewritten version, just return the latest N ratings for user & time control
        // (if you keep a separate history collection, change this logic)
        const ratings = await Rating.find({ userId, timeControl })
            .sort({ lastUpdated: -1 })
            .limit(parseInt(limit));
        res.json(ratings);
    } catch (error) {
        console.error('Get rating history error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'rating-service' });
});

app.listen(PORT, () => {
    console.log(`Rating Service listening on port ${PORT}`);
});
