const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  rating: { type: Number, default: 1200 },
  bullet: { type: Number, default: 1200 },
  blitz: { type: Number, default: 1200 },
  rapid: { type: Number, default: 1200 },
  puzzles: { type: Number, default: 1200 },
  gamesPlayed: { type: Number, default: 0 },
  gamesWon: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  isOnline: { type: Boolean, default: false },
});

const User = mongoose.model('User', userSchema);
module.exports = User;

