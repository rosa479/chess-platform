const { Chess } = require('chess.js');
const { v4: uuidv4 } = require('uuid');
const { redis } = require('../lib/db');
const User = require('../models/User');
const axios = require('axios'); // For internal or external hooks if needed (e.g. rating updates)

// Constants
const UNIFIED_BASE_URL = process.env.UNIFIED_BASE_URL || 'http://localhost:3001';

async function createGame({ whitePlayerId, blackPlayerId, timeControl, timeControlKey }) {
    const gameId = uuidv4();
    const chess = new Chess();

    const gameState = {
        gameId,
        whitePlayerId,
        blackPlayerId,
        fen: chess.fen(),
        whiteTimeLeftMs: timeControl.initialMs,
        blackTimeLeftMs: timeControl.initialMs,
        incrementMs: timeControl.incrementMs || 0,
        timeControl,
        timeControlKey,
        createdAt: Date.now(),
        lastMoveTimestamp: Date.now(),
    };

    await redis
        .multi()
        .set(`game:${gameId}`, JSON.stringify(gameState))
        .set(`player:game:${whitePlayerId}`, gameId)
        .set(`player:game:${blackPlayerId}`, gameId)
        .set(`activeGame:${whitePlayerId}`, gameId)
        .set(`activeGame:${blackPlayerId}`, gameId)
        .sadd('active_games', gameId)
        .exec();

    return gameState;
}

async function getGameState(gameId) {
    const data = await redis.get(`game:${gameId}`);
    return data ? JSON.parse(data) : null;
}

async function handlePlayerMove(gameId, playerId, move) {
    const lockKey = `lock:game:${gameId}`;

    // Simple lock
    const lock = await redis.set(lockKey, '1', 'NX', 'PX', 3000);
    if (!lock) return { error: 'Game busy' };

    try {
        const gameJSON = await redis.get(`game:${gameId}`);
        if (!gameJSON) return { error: 'Game not found' };

        const gameState = JSON.parse(gameJSON);
        const chess = new Chess(gameState.fen);

        // Turn validation
        const turn = chess.turn();
        if ((turn === 'w' && playerId !== gameState.whitePlayerId) ||
            (turn === 'b' && playerId !== gameState.blackPlayerId)) {
            return { error: 'Not your turn' };
        }

        // Time Calc
        const now = Date.now();
        const elapsed = now - gameState.lastMoveTimestamp;

        if (turn === 'w') {
            gameState.whiteTimeLeftMs -= elapsed;
            if (gameState.whiteTimeLeftMs <= 0) return await handleGameOver(gameState, chess, 'timeout', 'black');
        } else {
            gameState.blackTimeLeftMs -= elapsed;
            if (gameState.blackTimeLeftMs <= 0) return await handleGameOver(gameState, chess, 'timeout', 'white');
        }

        // Move
        const moveResult = chess.move(move);
        if (!moveResult) return { error: 'Illegal move' };

        // Increment
        if (gameState.incrementMs) {
            if (turn === 'w') gameState.whiteTimeLeftMs += gameState.incrementMs;
            else gameState.blackTimeLeftMs += gameState.incrementMs;
        }

        // Update State
        gameState.fen = chess.fen();
        gameState.lastMoveTimestamp = now;

        // Check Game Over
        if (chess.isGameOver()) {
            return await handleGameOver(
                gameState,
                chess,
                getTerminationReason(chess),
                getWinner(chess)
            );
        }

        await redis.set(`game:${gameId}`, JSON.stringify(gameState));
        return { success: true, newState: gameState };

    } finally {
        await redis.del(lockKey);
    }
}

const { calculateRatingChange } = require('../lib/rating');

async function handleGameOver(gameState, chess, reason, winner) {
    const endedKey = `game:ended:${gameState.gameId}`;
    const alreadyEnded = await redis.get(endedKey);
    if (alreadyEnded) return { gameOver: true, outcome: { winner, reason } };

    await redis.set(endedKey, '1', 'EX', 120);

    // Calculate ratings locally before cleanup to ensure we have data
    // We await this now to send the updates to the client immediately
    const ratingUpdates = await updateRatingsAndHistory(gameState, winner, reason);

    const outcome = {
        winner,
        reason,
        whiteRatingChange: ratingUpdates?.whiteRatingChange || 0,
        blackRatingChange: ratingUpdates?.blackRatingChange || 0,
        whiteRating: ratingUpdates?.newWhiteRating,
        blackRating: ratingUpdates?.newBlackRating,
    };

    // Perform cleanup
    await redis.del(`game:${gameState.gameId}`);
    await redis
        .multi()
        .srem('active_games', gameState.gameId)
        .del(`player:game:${gameState.whitePlayerId}`)
        .del(`player:game:${gameState.blackPlayerId}`)
        .del(`activeGame:${gameState.whitePlayerId}`)
        .del(`activeGame:${gameState.blackPlayerId}`)
        .set(`player:state:${gameState.whitePlayerId}`, 'IDLE') // Reset state
        .set(`player:state:${gameState.blackPlayerId}`, 'IDLE')
        .exec();

    return { success: true, gameOver: true, outcome };
}

async function resignGame(gameId, playerId) {
    const gameJSON = await redis.get(`game:${gameId}`);
    if (!gameJSON) return { error: 'Game not found' };

    const gameState = JSON.parse(gameJSON);

    // Validate player is in game
    if (gameState.whitePlayerId !== playerId && gameState.blackPlayerId !== playerId) {
        return { error: 'Not a player in this game' };
    }

    // Check if already ended
    const endedKey = `game:ended:${gameId}`;
    if (await redis.get(endedKey)) return { error: 'Game already ended' };

    const winner = playerId === gameState.whitePlayerId ? 'black' : 'white';
    const chess = new Chess(gameState.fen); // Load position for consistency

    return await handleGameOver(gameState, chess, 'resignation', winner);
    return await handleGameOver(gameState, chess, 'resignation', winner);
}

async function claimTimeout(gameId, claimantId) {
    const lockKey = `lock:game:${gameId}`;
    const lock = await redis.set(lockKey, '1', 'NX', 'PX', 3000);
    if (!lock) return { error: 'Game busy' };

    try {
        const gameJSON = await redis.get(`game:${gameId}`);
        if (!gameJSON) return { error: 'Game not found' };

        const gameState = JSON.parse(gameJSON);
        const chess = new Chess(gameState.fen);

        // Check time
        const now = Date.now();
        const elapsed = now - gameState.lastMoveTimestamp;
        const turn = chess.turn();

        // Calculate actual time left
        let whiteTime = gameState.whiteTimeLeftMs;
        let blackTime = gameState.blackTimeLeftMs;

        if (turn === 'w') whiteTime -= elapsed;
        else blackTime -= elapsed;

        // Verify timeout
        if (turn === 'w' && whiteTime > 0) return { error: 'White still has time' };
        if (turn === 'b' && blackTime > 0) return { error: 'Black still has time' };

        // Determine winner: The one who claimed it? Or the one who isn't moving?
        // If it's White's turn and time is up, Black wins (usually).
        // Unless Black has insufficient material.

        const winnerColor = turn === 'w' ? 'black' : 'white';
        // Need to check for insufficient material (draw) vs win
        // Simple check: does winner have material?
        // chess.js `insufficientMaterial` checks if *current* position is draw.
        // But if flag falls, does opponent have mating material?
        // For MVP: just award win.

        return await handleGameOver(gameState, chess, 'timeout', winnerColor);

    } finally {
        await redis.del(lockKey);
    }
}

async function updateRatingsAndHistory(gameState, winner, reason) {
    const whiteUser = await User.findOne({ userId: gameState.whitePlayerId });
    const blackUser = await User.findOne({ userId: gameState.blackPlayerId });

    if (!whiteUser || !blackUser) return null;

    const timeControlKey = gameState.timeControlKey || 'rapid'; // Default fallback
    const whiteRating = whiteUser[timeControlKey] || 1200;
    const blackRating = blackUser[timeControlKey] || 1200;

    // Calculate Score (1 for White win, 0 for Black win, 0.5 for Draw)
    let whiteScore = 0.5;
    if (winner === 'white') whiteScore = 1;
    else if (winner === 'black') whiteScore = 0;

    const whiteChange = calculateRatingChange(whiteRating, blackRating, whiteScore);
    const blackChange = calculateRatingChange(blackRating, whiteRating, 1 - whiteScore);

    const newWhiteRating = whiteRating + whiteChange;
    const newBlackRating = blackRating + blackChange;

    const finishDate = new Date();

    // Update White
    whiteUser[timeControlKey] = newWhiteRating;
    whiteUser.gamesPlayed++;
    if (winner === 'white') whiteUser.gamesWon++;
    whiteUser.gameHistory.unshift({
        gameId: gameState.gameId,
        opponentUserId: gameState.blackPlayerId,
        opponentUsername: blackUser.username,
        result: winner === 'white' ? 'won' : winner === 'draw' ? 'draw' : 'lost',
        ratingChange: whiteChange,
        termination: reason,
        playedAt: finishDate,
        timeControl: timeControlKey
    });

    // Update Black
    blackUser[timeControlKey] = newBlackRating;
    blackUser.gamesPlayed++;
    if (winner === 'black') blackUser.gamesWon++;
    blackUser.gameHistory.unshift({
        gameId: gameState.gameId,
        opponentUserId: gameState.whitePlayerId,
        opponentUsername: whiteUser.username,
        result: winner === 'black' ? 'won' : winner === 'draw' ? 'draw' : 'lost',
        ratingChange: blackChange,
        termination: reason,
        playedAt: finishDate,
        timeControl: timeControlKey
    });

    try {
        await Promise.all([whiteUser.save(), blackUser.save()]);
        console.log(`[GameService] History & Ratings saved. White: ${whiteRating}->${newWhiteRating}, Black: ${blackRating}->${newBlackRating}`);
        return {
            whiteRatingChange: whiteChange,
            blackRatingChange: blackChange,
            newWhiteRating,
            newBlackRating
        };
    } catch (err) {
        console.error('[GameService] Failed to save history:', err);
        return null;
    }
}

function getTerminationReason(chess) {
    if (chess.isCheckmate()) return 'checkmate';
    if (chess.isStalemate()) return 'stalemate';
    if (chess.isThreefoldRepetition()) return 'repetition';
    if (chess.isInsufficientMaterial()) return 'insufficient material';
    if (chess.isDraw()) return 'draw by 50-move rule';
    return 'unknown';
}

function getWinner(chess) {
    if (!chess.isGameOver()) return null;
    if (chess.isCheckmate()) return chess.turn() === 'w' ? 'black' : 'white';
    return 'draw';
}

module.exports = {
    createGame,
    getGameState,
    handlePlayerMove,
    handleGameOver,
    handleGameOver,
    resignGame,
    claimTimeout
};
