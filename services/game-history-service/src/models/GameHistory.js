const mongoose = require('mongoose');

const gameHistorySchema = new mongoose.Schema({
  gameId: { type: String, required: true, unique: true },
  whitePlayerId: { type: String, required: true },
  blackPlayerId: { type: String, required: true },
  whiteUsername: { type: String, default: 'Unknown' },
  blackUsername: { type: String, default: 'Unknown' },
  whiteRating: { type: Number, default: 1200 },
  blackRating: { type: Number, default: 1200 },
  result: { type: String, enum: ['white', 'black', 'draw'], required: true },
  termination: { type: String },
  timeControl: { type: String },
  pgn: { type: String, default: '' },
  moves: { type: [String], default: [] },
  gameDuration: { type: Number, default: 0 },
  startedAt: { type: Date, default: () => new Date() },
  endedAt: { type: Date, default: () => new Date() },
  createdAt: { type: Date, default: () => new Date() },
}, { collection: 'gameHistories' });

module.exports = mongoose.model('GameHistory', gameHistorySchema);

