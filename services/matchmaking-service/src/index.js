require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('redis');
const { v4: uuidv4 } = require('uuid');

// Use node-fetch if available globally, otherwise require it
const fetch = global.fetch || require('node-fetch');

const app = express();
app.use(express.json());

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:8080',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

const PORT = process.env.PORT || 3004;

/* ================== CONFIG ================== */

const TIME_CONTROLS = {
  bullet: { initialMs: 60000, incrementMs: 0 },
  blitz: { initialMs: 300000, incrementMs: 0 },
  rapid: { initialMs: 600000, incrementMs: 0 },
  classical: { initialMs: 1800000, incrementMs: 0 },
  bullet_increment: { initialMs: 120000, incrementMs: 1000 },
  blitz_increment: { initialMs: 300000, incrementMs: 2000 },
  rapid_increment: { initialMs: 600000, incrementMs: 5000 },
};

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const GAME_SERVICE_URL = process.env.GAME_SERVICE_URL || 'http://localhost:3003';

/* ================== REDIS ================== */

const redis = createClient({ url: REDIS_URL });
redis.on('error', err => console.error('Redis error', err));

(async () => {
  await redis.connect();
  console.log('✅ Connected to Redis (matchmaking)');
  console.log(`🔗 Using GAME_SERVICE_URL = ${GAME_SERVICE_URL}`);
})();

/* ================== API ================== */

// Join matchmaking
app.post('/matchmaking/join', async (req, res) => {
  try {
    const { userId, timeControl, rating } = req.body;

    if (!userId || !TIME_CONTROLS[timeControl] || typeof rating !== 'number') {
      return res.status(400).json({ error: 'Invalid input' });
    }

    const exists = await redis.exists(`entry:${userId}`);
    if (exists) {
      return res.status(409).json({ error: 'Already in queue' });
    }

    const joinedAt = Date.now();

    await redis
      .multi()
      .hSet(`entry:${userId}`, {
        userId,
        rating,
        timeControl,
        joinedAt,
      })
      .zAdd(`queue:${timeControl}`, {
        score: rating,
        value: userId,
      })
      .expire(`entry:${userId}`, 120) // Expire entry after 2 mins to prevent zombies
      .exec();

    res.json({ message: 'Added to queue' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Leave matchmaking
app.post('/matchmaking/leave', async (req, res) => {
  const { userId } = req.body;

  try {
    const entry = await redis.hGetAll(`entry:${userId}`);
    if (!entry || !entry.timeControl) {
      // Clean up just in case
      await redis.del(`entry:${userId}`);
      return res.json({ success: true });
    }

    await redis
      .multi()
      .zRem(`queue:${entry.timeControl}`, userId)
      .del(`entry:${userId}`)
      .del(`lock:${userId}`)
      .exec();

    res.json({ success: true });
  } catch (err) {
    console.error('Error leaving queue:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Clear active game (useful when game ends and is deleted)
app.post('/matchmaking/clear-active-game', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'User ID is required' });

  await redis.del(`activeGame:${userId}`);
  res.json({ success: true });
});

// Status check
app.get('/matchmaking/status/:userId', async (req, res) => {
  const userId = req.params.userId;
  const entry = await redis.hGetAll(`entry:${userId}`);

  // If valid queue entry found
  if (entry.timeControl) {
    return res.json({
      inQueue: true,
      timeControl: entry.timeControl,
      rating: Number(entry.rating),
      joinedAt: Number(entry.joinedAt),
      hasGame: false,
      gameId: null,
    });
  }

  // If not in queue, check if game was created
  const activeGameId = await redis.get(`activeGame:${userId}`);
  res.json({
    inQueue: false,
    hasGame: !!activeGameId,
    gameId: activeGameId || null,
  });
});

// Get active game for a user
app.get('/matchmaking/game/:userId', async (req, res) => {
  const userId = req.params.userId;
  const gameId = await redis.get(`activeGame:${userId}`);
  if (!gameId) {
    return res.status(404).json({ error: 'No active game for user' });
  }
  res.json({ gameId });
});

// Time controls
app.get('/matchmaking/time-controls', (_, res) => {
  res.json(TIME_CONTROLS);
});

/* ================== MATCHMAKING WORKER ================== */

async function matchmakingLoop() {
  for (const timeControl of Object.keys(TIME_CONTROLS)) {
    // Fetch users in queue for this time control
    const users = await redis.zRangeWithScores(
      `queue:${timeControl}`,
      0,
      -1
    );

    if (users.length < 2) continue;

    const locks = [];
    try {
      // Naive implementation: Pair first two available
      // (Improvements: scan for similar ratings)
      const [userA, userB] = users;

      // Lock both users to prevent double-pairing
      const lockA = await redis.set(`lock:${userA.value}`, '1', { NX: true, PX: 5000 });
      const lockB = await redis.set(`lock:${userB.value}`, '1', { NX: true, PX: 5000 });
      
      if (!lockA || !lockB) {
        // Failed to lock one, release whoever we locked and retry next tick
        if (lockA) await redis.del(`lock:${userA.value}`);
        if (lockB) await redis.del(`lock:${userB.value}`);
        continue; 
      }
      
      locks.push(`lock:${userA.value}`, `lock:${userB.value}`);

      const entryA = await redis.hGetAll(`entry:${userA.value}`);
      const entryB = await redis.hGetAll(`entry:${userB.value}`);

      // Integrity check
      if (!entryA.timeControl || !entryB.timeControl) continue;
      if (entryA.timeControl === timeControl && entryB.timeControl === timeControl) {
        await createMatch(userA.value, userB.value, timeControl);
      }
    } catch (err) {
      console.error('Matchmaking loop error:', err);
    } finally {
      // Always release locks
      for (const key of locks) {
        await redis.del(key);
      }
    }
  }
}

async function createMatch(userA, userB, timeControl) {
  const white = Math.random() > 0.5 ? userA : userB;
  const black = white === userA ? userB : userA;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);

  try {
    const url = `${GAME_SERVICE_URL}/games`;
    
    // IMPORTANT: We send 'pending' status or similar to tell Game Service
    // NOT to start the clock immediately.
    const payload = {
      whitePlayerId: white,
      blackPlayerId: black,
      timeControl: TIME_CONTROLS[timeControl],
      gameState: 'waiting_for_first_move', // Signal for the Game Service
      autoStart: false                     // Explicit flag if your Game Service supports it
    };

    console.log('🎯 Creating game via game-lifecycle service', { url, payload });

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Game Service Error: ${res.statusText}`);
    }

    const body = await res.json().catch(() => null);
    const gameId = body?.gameId;

    if (!gameId) {
      throw new Error('Game service did not return gameId');
    }

    // Atomic Cleanup & Handoff
    await redis
      .multi()
      .zRem(`queue:${timeControl}`, userA, userB)
      .del(`entry:${userA}`, `entry:${userB}`)
      .del(`lock:${userA}`, `lock:${userB}`)
      // Set active game with 1 hour expiry
      .set(`activeGame:${userA}`, gameId, { EX: 3600 }) 
      .set(`activeGame:${userB}`, gameId, { EX: 3600 })
      .exec();

    console.log(`♟️ Match created: ${white} (W) vs ${black} (B) -> Game ${gameId}`);
  } catch (err) {
    console.error(`❌ Match creation failed for ${userA} vs ${userB}:`, err.message);
    // Locks released in finally block of caller
  } finally {
    clearTimeout(timeout);
  }
}

/* ================== LOOP ================== */

let isRunning = false;
setInterval(async () => {
  if (isRunning) return;
  isRunning = true;
  try {
    await matchmakingLoop();
  } finally {
    isRunning = false;
  }
}, 1000);

/* ================== HEALTH ================== */

app.get('/health', (_, res) => {
  res.json({ status: 'healthy' });
});

/* ================== BOOT ================== */

app.listen(PORT, () => {
  console.log(`♟️ Matchmaking service running on ${PORT}`);
});