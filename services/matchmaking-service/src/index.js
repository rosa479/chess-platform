require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Redis = require('ioredis');

// node-fetch fallback
const fetch = global.fetch || require('node-fetch');

const mongoose = require('mongoose');
const mongoUri = process.env.MONGO_URI || 'mongodb://mongodb:27017/default';

mongoose
  .connect(mongoUri)
  .then(() => console.log('✅ Connected to MongoDB (fallback)'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

const app = express();
app.use(express.json());

app.use(
  cors({
    origin: ['http://localhost:5173', 'http://localhost:8080'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// request logger
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

const PORT = 3004;

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

const GAME_SERVICE_URL = process.env.GAME_SERVICE_URL;
console.log(`🔗 GAME_SERVICE_URL = ${GAME_SERVICE_URL}`);

const redis = new Redis({ host: 'redis', port: 6379 });

let redisConnected = false;
redis.on('connect', () => {
  redisConnected = true;
  console.log('✅ Connected to Redis (matchmaking)');
});
redis.on('end', () => {
  redisConnected = false;
  console.log('❌ Lost Redis connection');
});
redis.on('error', err => console.error('Redis error', err));

/* ================== API ================== */

app.post('/matchmaking/join', async (req, res) => {
  try {
    const { userId, timeControl, rating } = req.body;
    if (!userId || !TIME_CONTROLS[timeControl] || typeof rating !== 'number') {
      return res.status(400).json({ error: 'Invalid input' });
    }

    const stateKey = `player:state:${userId}`;
    const state = await redis.get(stateKey);

    if (state === 'QUEUED') return res.json({ status: 'queued' });
    if (state === 'IN_GAME') {
      const gameId = await redis.get(`player:game:${userId}`);
      return res.json({ status: 'in_game', gameId });
    }

    await redis
      .multi()
      .set(stateKey, 'QUEUED')
      .hset(
        `entry:${userId}`,
        'userId',
        userId,
        'rating',
        rating,
        'timeControl',
        timeControl,
        'joinedAt',
        Date.now()
      )
      .zadd(`queue:${timeControl}`, rating, userId)
      .sadd('queued_users', userId)
      .expire(`entry:${userId}`, 120)
      .expire(stateKey, 120)
      .exec();

    res.json({ status: 'queued' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/matchmaking/leave', async (req, res) => {
  const { userId } = req.body;
  try {
    const entry = await redis.hgetall(`entry:${userId}`);
    if (entry?.timeControl) {
      await redis
        .multi()
        .zrem(`queue:${entry.timeControl}`, userId)
        .del(`entry:${userId}`)
        .del(`player:state:${userId}`)
        .srem('queued_users', userId)
        .exec();
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.get('/matchmaking/status/:userId', async (req, res) => {
  const userId = req.params.userId;
  const entry = await redis.hgetall(`entry:${userId}`);

  if (entry?.timeControl) {
    return res.json({
      inQueue: true,
      timeControl: entry.timeControl,
      rating: Number(entry.rating),
      joinedAt: Number(entry.joinedAt),
      hasGame: false,
      gameId: null,
    });
  }

  const gameId = await redis.get(`activeGame:${userId}`);
  res.json({
    inQueue: false,
    hasGame: !!gameId,
    gameId: gameId || null,
  });
});

app.get('/matchmaking/game/:userId', async (req, res) => {
  const userId = req.params.userId;
  console.log(`🔎 Checking Redis for activeGame:${userId}`);
  const gameId = await redis.get(`activeGame:${userId}`);
  console.log(`📊 Redis result:`, gameId);

  if (!gameId) return res.status(404).json({ error: 'No active game for user' });
  res.json({ gameId });
});

app.get('/matchmaking/time-controls', (_req, res) => {
  res.json(TIME_CONTROLS);
});

/* ================== MATCHMAKING ================== */

async function matchmakingLoop() {
  const allQueued = await redis.smembers('queued_users');

  for (const timeControl of Object.keys(TIME_CONTROLS)) {
    const users = await redis.zrange(`queue:${timeControl}`, 0, -1);

    // cleanup ghosts
    for (const u of users) {
      if (!allQueued.includes(u)) {
        await redis.zrem(`queue:${timeControl}`, u);
      }
    }

    if (users.length < 2) continue;

    const [userA, userB] = users;

    const locks = [];
    try {
      if (!userA || !userB) throw new Error('Invalid users');

      const lockA = await redis.set(`lock:${userA}`, '1', 'NX', 'PX', 5000);
      const lockB = await redis.set(`lock:${userB}`, '1', 'NX', 'PX', 5000);

      if (!lockA || !lockB) {
        if (lockA) await redis.del(`lock:${userA}`);
        if (lockB) await redis.del(`lock:${userB}`);
        return;
      }

      locks.push(`lock:${userA}`, `lock:${userB}`);
      console.log(`✅ Matching ${userA} vs ${userB}`);
      await createMatch(userA, userB, timeControl);
    } catch (err) {
      console.error('Matchmaking error:', err);
    } finally {
      for (const k of locks) await redis.del(k);
    }
  }
}

async function createMatch(userA, userB, timeControl) {
  const white = Math.random() > 0.5 ? userA : userB;
  const black = white === userA ? userB : userA;

  const res = await fetch(`${GAME_SERVICE_URL}/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      whitePlayerId: white,
      blackPlayerId: black,
      timeControl: TIME_CONTROLS[timeControl],
      gameState: 'waiting_for_first_move',
      autoStart: false,
    }),
  });

  if (!res.ok) throw new Error('Game service failed');
  const { gameId } = await res.json();
  if (!gameId) throw new Error('Missing gameId');

  await redis
    .multi()
    .zrem(`queue:${timeControl}`, userA, userB)
    .del(`entry:${userA}`, `entry:${userB}`)
    .srem('queued_users', userA, userB)
    .set(`player:state:${userA}`, 'IN_GAME')
    .set(`player:state:${userB}`, 'IN_GAME')
    .set(`player:game:${userA}`, gameId)
    .set(`player:game:${userB}`, gameId)
    .set(`activeGame:${userA}`, gameId)
    .set(`activeGame:${userB}`, gameId)
    .exec();
}

/* ================== LOOP ================== */

let running = false;
setInterval(async () => {
  if (!redisConnected || running) return;
  running = true;
  try {
    await matchmakingLoop();
  } finally {
    running = false;
  }
}, 1000);

/* ================== HEALTH ================== */

app.get('/health', (_req, res) => res.json({ status: 'healthy' }));

/* ================== BOOT ================== */

app.listen(PORT, () => {
  console.log(`♟️ Matchmaking service running on port ${PORT}`);
});
