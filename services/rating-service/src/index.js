require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const Rating = require('./models/Rating');
const User = require('./models/User');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3002;

/* =========================
   MongoDB Connection
   ========================= */
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://mongodb:27017/chess-rating')
  .then(() => console.log('Connected to MongoDB for rating service'))
  .catch(err => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });

/* =========================
   Glicko-2 Constants
   ========================= */
const TAU = 0.0833;
const EPSILON = 0.000001;

/* =========================
   Glicko-2 Rating Class
   ========================= */
class Glicko2Rating {
  constructor(rating = 1500, ratingDeviation = 350, volatility = 0.06) {
    this.rating = rating;
    this.ratingDeviation = ratingDeviation;
    this.volatility = volatility;
  }

  toGlicko2() {
    return {
      mu: (this.rating - 1500) / 173.7178,
      phi: this.ratingDeviation / 173.7178,
      sigma: this.volatility
    };
  }

  fromGlicko2(mu, phi, sigma) {
    this.rating = 173.7178 * mu + 1500;
    this.ratingDeviation = 173.7178 * phi;
    this.volatility = sigma;
  }

  updateRating(opponents, results) {
    const { mu, phi, sigma } = this.toGlicko2();

    let v = 0;
    let delta = 0;

    for (let i = 0; i < opponents.length; i++) {
      const opp = opponents[i].toGlicko2();
      const g = 1 / Math.sqrt(1 + (3 * opp.phi ** 2) / Math.PI ** 2);
      const E = 1 / (1 + Math.exp(-g * (mu - opp.mu)));
      v += g ** 2 * E * (1 - E);
      delta += g * (results[i] - E);
    }

    v = 1 / v;
    delta *= v;

    const newPhi = Math.sqrt(phi ** 2 + sigma ** 2);
    const newMu = mu + newPhi ** 2 * delta;

    this.fromGlicko2(newMu, newPhi, sigma);
  }
}

/* ======================================================
   GET rating by userId + timeControl
   ====================================================== */
app.get('/ratings/:userId/:timeControl', async (req, res) => {
  try {
    const { userId, timeControl } = req.params;

    const rating = await Rating.findOne({ userId, timeControl });

    if (!rating) {
      return res.json({
        userId,
        timeControl,
        rating: 1500,
        ratingDeviation: 350,
        volatility: 0.06,
        gamesPlayed: 0,
        lastUpdated: new Date().toISOString()
      });
    }

    res.json(rating);
  } catch (err) {
    console.error('Get rating error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/* ======================================================
   GET rating (query-based timeControl)
   ====================================================== */
app.get('/ratings/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { timeControl = 'overall' } = req.query;

    const rating = await Rating.findOne({ userId, timeControl });

    if (!rating) {
      return res.json({
        userId,
        timeControl,
        rating: 1500,
        ratingDeviation: 350,
        volatility: 0.06,
        gamesPlayed: 0,
        lastUpdated: new Date().toISOString()
      });
    }

    res.json(rating);
  } catch (err) {
    console.error('Get rating error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/* ======================================================
   POST update ratings after game
   ====================================================== */
app.post('/ratings/update', async (req, res) => {
  console.log('[DEBUG] /ratings/update endpoint hit.');
  try {
    const { whitePlayerId, blackPlayerId, result, timeControl = 'overall' } = req.body;
  console.log(`[DEBUG] Received update request: white=${whitePlayerId}, black=${blackPlayerId}, result=${result}, timeControl=${timeControl}`);

    const whiteDoc = await Rating.findOne({ userId: whitePlayerId, timeControl });
    const blackDoc = await Rating.findOne({ userId: blackPlayerId, timeControl });

    const whiteBase = whiteDoc || { rating: 1500, ratingDeviation: 350, volatility: 0.06, gamesPlayed: 0 };
    const blackBase = blackDoc || { rating: 1500, ratingDeviation: 350, volatility: 0.06, gamesPlayed: 0 };

    const white = new Glicko2Rating(whiteBase.rating, whiteBase.ratingDeviation, whiteBase.volatility);
    const black = new Glicko2Rating(blackBase.rating, blackBase.ratingDeviation, blackBase.volatility);

    const whiteResult = result === 'white' ? 1 : result === 'draw' ? 0.5 : 0;
    const blackResult = 1 - whiteResult;

    white.updateRating([black], [whiteResult]);
    black.updateRating([white], [blackResult]);

    const updatedWhite = {
      userId: whitePlayerId,
      timeControl,
      rating: Math.round(white.rating),
      ratingDeviation: Math.round(white.ratingDeviation),
      volatility: white.volatility,
      gamesPlayed: whiteBase.gamesPlayed + 1,
      lastUpdated: new Date()
    };

    const updatedBlack = {
      userId: blackPlayerId,
      timeControl,
      rating: Math.round(black.rating),
      ratingDeviation: Math.round(black.ratingDeviation),
      volatility: black.volatility,
      gamesPlayed: blackBase.gamesPlayed + 1,
      lastUpdated: new Date()
    };

    await Rating.updateOne({ userId: whitePlayerId, timeControl }, updatedWhite, { upsert: true });
    await Rating.updateOne({ userId: blackPlayerId, timeControl }, updatedBlack, { upsert: true });

    res.json({
      whiteRating: updatedWhite,
      blackRating: updatedBlack,
      ratingChanges: {
        white: updatedWhite.rating - whiteBase.rating,
        black: updatedBlack.rating - blackBase.rating
      }
    });
  } catch (err) {
    console.error('Update rating error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/* =========================
   Health Check
   ========================= */
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'rating-service' });
});

app.listen(PORT, () => {
  console.log(`Rating Service listening on port ${PORT}`);
});
