const mongoose = require('mongoose');

const leaderboardSchema = new mongoose.Schema({
  timeControl: { type: String, default: 'overall', index: true },
  userId: { type: String, required: true, index: true },
  rating: { type: Number, required: true }
});

leaderboardSchema.index({ timeControl: 1, rating: -1 });

const Leaderboard = mongoose.model('Leaderboard', leaderboardSchema);
module.exports = Leaderboard;

