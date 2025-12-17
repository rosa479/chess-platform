require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('redis');
const { v4: uuidv4 } = require('uuid');

const fetch = global.fetch || require('node-fetch');

const app = express();
app.use(express.json());

// CORS configuration to allow the frontend (localhost:8080) during development
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:8080',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Matchmaking service port (per currWorking.md it runs on 3004)
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

const RATING_TOLERANCE = 200;
const MAX_WAIT_TIME = Number(process.env.MAX_WAIT_TIME_MS || 30000);

const REDIS_URL =
  process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// Game Lifecycle Service now runs on 3003 (use fixed URL for local dev)
const GAME_SERVICE_URL = 'http://localhost:3003';

/* ================== REDIS ================== */

const redis = createClient({ url: REDIS_URL });
redis.on('error', err => console.error('Redis error', err));

(async () => {
  await redis.connect();
  console.log('✅ Connected to Redis (matchmaking)');
  console.log(`🔗 Using GAME_SERVICE_URL = ${GAME_SERVICE_URL}`);
})();

/*
Redis Keys
----------
queue:{timeControl}      -> ZSET  (score = rating, value = userId)
entry:{userId}           -> HASH  (rating, timeControl, joinedAt)
lock:{userId}            -> STRING (SET NX PX)
activeGame:{userId}      -> STRING (gameId for an active game)
*/

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
      .expire(`entry:${userId}`, 120)
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

  const entry = await redis.hGetAll(`entry:${userId}`);
  if (!entry.timeControl) {
    return res.json({ success: false });
  }

  await redis
    .multi()
    .zRem(`queue:${entry.timeControl}`, userId)
    .del(`entry:${userId}`)
    .del(`lock:${userId}`)
    .exec();

  res.json({ success: true });
});

// Status
app.get('/matchmaking/status/:userId', async (req, res) => {
  const userId = req.params.userId;
  const entry = await redis.hGetAll(`entry:${userId}`);

  // If no queue entry, check if user has an active game
  if (!entry.timeControl) {
    const activeGameId = await redis.get(`activeGame:${userId}`);
    return res.json({
      inQueue: false,
      hasGame: !!activeGameId,
      gameId: activeGameId || null,
    });
  }

  res.json({
    inQueue: true,
    timeControl: entry.timeControl,
    rating: Number(entry.rating),
    waitTime: Date.now() - Number(entry.joinedAt),
    hasGame: false,
    gameId: null,
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
    const users = await redis.zRangeWithScores(
      `queue:${timeControl}`,
      0,
      -1
    );

    for (const userA of users) {
      const lockA = await redis.set(`lock:${userA.value}`, '1', {
        NX: true,
        PX: 5000,
      });
      if (!lockA) continue;

      const entryA = await redis.hGetAll(`entry:${userA.value}`);
      if (!entryA.timeControl) {
        await redis.del(`lock:${userA.value}`);
        continue;
      }

      const waitTime = Date.now() - Number(entryA.joinedAt);
      let tolerance = RATING_TOLERANCE;

      if (waitTime > MAX_WAIT_TIME) tolerance *= 3;
      else if (waitTime > MAX_WAIT_TIME / 2) tolerance *= 2;

      const min = userA.score - tolerance;
      const max = userA.score + tolerance;

      const candidates = await redis.zRangeByScore(
        `queue:${timeControl}`,
        min,
        max
      );

      for (const userB of candidates) {
        if (userB === userA.value) continue;

        const lockB = await redis.set(`lock:${userB}`, '1', {
          NX: true,
          PX: 5000,
        });
        if (!lockB) continue;

        await createMatch(userA.value, userB, timeControl);
        return;
      }

      await redis.del(`lock:${userA.value}`);
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
    const payload = {
      whitePlayerId: white,
      blackPlayerId: black,
      timeControl: TIME_CONTROLS[timeControl],
    };

    console.log('🎯 Creating game via game-lifecycle service', {
      url,
      payload,
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => '<no body>');
      console.error('❌ Game service responded with error', {
        status: res.status,
        statusText: res.statusText,
        body: errorBody,
      });
      throw new Error('Game service error');
    }

    const body = await res.json().catch(() => null);
    const gameId = body?.gameId;

    if (!gameId) {
      console.error('Game service did not return gameId');
      throw new Error('Game service did not return gameId');
    }

    // Remove players from queue and record their active game
    await redis
      .multi()
      .zRem(`queue:${timeControl}`, userA, userB)
      .del(`entry:${userA}`, `entry:${userB}`)
      .del(`lock:${userA}`, `lock:${userB}`)
      .set(`activeGame:${userA}`, gameId, { EX: 60 * 60 })
      .set(`activeGame:${userB}`, gameId, { EX: 60 * 60 })
      .exec();

    console.log(`♟️ Match created: ${userA} vs ${userB} -> game ${gameId}`);
  } catch (err) {
    console.error('❌ Match creation failed', err.message);
    await redis.del(`lock:${userA}`, `lock:${userB}`);
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
