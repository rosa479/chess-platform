const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  timeControl: { type: String, default: 'overall', index: true },
  rating: { type: Number, default: 1500 },
  ratingDeviation: { type: Number, default: 350 },
  volatility: { type: Number, default: 0.06 },
  gamesPlayed: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now }
});

ratingSchema.index({ userId: 1, timeControl: 1 }, { unique: true });

const Rating = mongoose.model('Rating', ratingSchema);
module.exports = Rating;

