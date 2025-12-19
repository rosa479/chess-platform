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
const corsOptions = {
  origin: process.env.CORS_ORIGIN || true, // Allow all origins in development
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};
app.use(cors(corsOptions));

// Log all incoming requests for debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

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
// Game lifecycle service runs on port 3003 (per currWorking.md)
// IMPORTANT: We hardcode localhost:3003 here to avoid stale or conflicting GAME_SERVICE_URL env vars
const GAME_SERVICE_URL = 'http://localhost:3003';

// Log configuration on startup
console.log(`🔗 GAME_SERVICE_URL = ${GAME_SERVICE_URL}`);
console.log(`🔗 REDIS_URL = ${REDIS_URL}`);

/* ================== REDIS ================== */

const redis = createClient({ url: REDIS_URL });
redis.on('error', err => console.error('Redis error', err));

// Track if Redis is connected
let redisConnected = false;

(async () => {
  try {
    await redis.connect();
    redisConnected = true;
    console.log('✅ Connected to Redis (matchmaking)');
    console.log(`🔗 Using GAME_SERVICE_URL = ${GAME_SERVICE_URL}`);
  } catch (error) {
    console.error('❌ Failed to connect to Redis:', error);
    process.exit(1);
  }
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
  try {
    console.log(`🔍 GET /matchmaking/game/:userId - userId: ${req.params.userId}`);
    const userId = req.params.userId;
    if (!userId) {
      console.error('❌ Missing userId parameter');
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    console.log(`🔎 Checking Redis for activeGame:${userId}`);
    const gameId = await redis.get(`activeGame:${userId}`);
    console.log(`📊 Redis result for activeGame:${userId}:`, gameId);
    
    if (!gameId) {
      console.log(`⚠️ No active game found for user ${userId} - returning 404`);
      res.status(404).json({ error: 'No active game for user' });
      return;
    }
    
    console.log(`✅ Found active game ${gameId} for user ${userId} - returning 200`);
    res.json({ gameId });
  } catch (err) {
    console.error('❌ Error getting active game:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error', details: err.message });
    }
  }
});

// Time controls
app.get('/matchmaking/time-controls', (_, res) => {
  res.json(TIME_CONTROLS);
});

/* ================== MATCHMAKING WORKER ================== */

async function matchmakingLoop() {
  for (const timeControl of Object.keys(TIME_CONTROLS)) {
    try {
      // Fetch users in queue for this time control
      const users = await redis.zRangeWithScores(
        `queue:${timeControl}`,
        0,
        -1
      );

      if (users.length < 2) {
        if (users.length > 0) {
          console.log(`⏳ Queue '${timeControl}' has ${users.length} user(s), waiting for more...`);
        }
        continue;
      }

      console.log(`🎯 Found ${users.length} users in queue '${timeControl}', attempting to match...`);

      // Naive implementation: pair the first two users in this queue
      const [userA, userB] = users;

      const locks = [];
      try {
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

        console.log(`✅ Matching users ${userA.value} vs ${userB.value} for ${timeControl}`);
        await createMatch(userA.value, userB.value, timeControl);
      } catch (err) {
        console.error('Matchmaking loop error:', err);
      } finally {
        // Always release locks
        for (const key of locks) {
          await redis.del(key);
        }
      }
    } catch (err) {
      console.error(`❌ Error processing queue '${timeControl}':`, err);
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

    console.log('🎯 Creating game via game-lifecycle service');
    console.log(`   URL: ${url}`);
    console.log(`   Payload:`, JSON.stringify(payload, null, 2));

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify(payload),
    });

    console.log(`📡 Response status: ${res.status} ${res.statusText}`);
    
    if (!res.ok) {
      const errorText = await res.text().catch(() => 'No error details');
      console.error(`❌ Game Service Error Response:`, errorText);
      throw new Error(`Game Service Error: ${res.status} ${res.statusText} - ${errorText}`);
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
  if (!redisConnected || isRunning) return;
  isRunning = true;
  try {
    await matchmakingLoop();
  } catch (err) {
    console.error('❌ Matchmaking loop error:', err);
  } finally {
    isRunning = false;
  }
}, 1000);

/* ================== HEALTH ================== */

app.get('/health', (_, res) => {
  res.json({ status: 'healthy' });
});

/* ================== 404 HANDLER ================== */

app.use((req, res) => {
  console.log(`404: ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Route not found', path: req.path });
});

/* ================== BOOT ================== */

app.listen(PORT, () => {
  console.log(`♟️ Matchmaking service running on port ${PORT}`);
  console.log(`Available routes:`);
  console.log(`  GET  /health`);
  console.log(`  GET  /matchmaking/time-controls`);
  console.log(`  GET  /matchmaking/status/:userId`);
  console.log(`  GET  /matchmaking/game/:userId`);
  console.log(`  POST /matchmaking/join`);
  console.log(`  POST /matchmaking/leave`);
  console.log(`  POST /matchmaking/clear-active-game`);
  console.log(`\n✅ All routes registered successfully`);
});