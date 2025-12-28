require('dotenv').config();
const { WebSocketServer } = require('ws');
const { createClient } = require('redis');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const url = require('url');

const PORT = process.env.PORT;
const JWT_SECRET = process.env.JWT_SECRET;

// Initialize Redis clients
// One for publishing messages, one for subscribing to channels
const publisher = createClient({ url: process.env.REDIS_URL });
const subscriber = publisher.duplicate();

// Map to store connection details for clients connected to THIS server instance
const clients = new Map();
// Map to track which games this server instance is subscribed to in Redis
const gameSubscriptions = new Map();

const wss = new WebSocketServer({ port: PORT });

wss.on('connection', async (ws, req) => {
    const connectionId = uuidv4();
    let token, gameId;
// 1. Support for WebSocket handshake with Socket.IO style as well as header/bearer
if (req.headers['authorization']) {
  token = req.headers['authorization'];
  if (token.startsWith('Bearer ')) token = token.slice(7);
  const query = url.parse(req.url, true).query;
  gameId = query.gameId;
} else {
  const query = url.parse(req.url, true).query;
  token = query.token;
  gameId = query.gameId;
}

    // 1. --- Authentication ---
    if (!token) {
        ws.close(1008, 'Token required.');
        return;
    }
    let decodedToken;
    try {
        decodedToken = jwt.verify(token, JWT_SECRET);
        ws.userId = decodedToken.userId;
    } catch {
        ws.close(1008, 'Invalid token.');
        return;
    }

    // Strict IN_GAME check in Redis
    let foundGameId = null;
    try {
        const Redis = require('ioredis');
const redisClient = new Redis({ host: 'redis', port: 6379, family: 4 });
        await redisClient.connect();
        const state = await redisClient.get(`player:state:${decodedToken.userId}`);
        if (state !== 'IN_GAME') {
            await redisClient.disconnect();
            ws.close(1008, 'Not in game.');
            return;
        }
        foundGameId = await redisClient.get(`player:game:${decodedToken.userId}`);
        await redisClient.disconnect();
    } catch {}
    if (!foundGameId) {
        ws.close(1008, 'Not in game.');
        return;
    }
    if (!gameId || foundGameId !== gameId) {
        ws.close(1008, 'Game ID mismatch or not provided.');
        return;
    }
    clients.set(connectionId, { ws, userId: decodedToken.userId, gameId });
    ws.room = `game:${gameId}`;

    // Store connection details for this instance
    clients.set(connectionId, { ws, userId: decodedToken.userId, gameId });
    // Join user to room by gameId for easy broadcasting
    ws.room = `game:${gameId}`;

    // 2. --- Redis Subscription ---
    // If this is the first client for this game on this server instance, subscribe to the game's channel
    if (!gameSubscriptions.has(gameId) || gameSubscriptions.get(gameId) === 0) {
        await subscriber.subscribe(`game-updates:${gameId}`, (message) => {
            // This callback is triggered when a message is published on the channel
            const parsedMessage = JSON.parse(message);
            console.log(`Broadcasting update for game ${gameId} to relevant clients on this instance.`);
            
            // Broadcast the message to all clients on this instance playing in the same game
            clients.forEach((client) => {
                if (client.gameId === gameId && client.ws.readyState === client.ws.OPEN) {
                    client.ws.send(JSON.stringify(parsedMessage));
                }
            });
        });
        gameSubscriptions.set(gameId, 1);
    } else {
        gameSubscriptions.set(gameId, gameSubscriptions.get(gameId) + 1);
    }

    // 3. --- Heartbeat for Connection Health ---
    ws.isAlive = true;
    ws.on('pong', () => {
        ws.isAlive = true;
    });

    // Send initial game state immediately after join (for instant board render)
    try {
      // Assume async getInitialGameState is available or you can get from Redis/DB
      const gameState = {} // ...fetch game initial state here (stubbed)
      ws.send(JSON.stringify({ type: 'game-state', ...gameState }));
    } catch (err) {
      console.error('Failed to send initial game state', err);
    }

    // 4. --- Message Handling from Client ---
    ws.on('message', (rawMessage) => {
        try {
            const message = JSON.parse(rawMessage);
            console.log(`Received message from ${decodedToken.userId}:`, message);

            // This gateway doesn't process game logic. It just forwards actions.
            // We publish the action to a channel that the game-lifecycle-service listens to.
            const payload = {
               ...message.payload,
                userId: decodedToken.userId,
                gameId: gameId,
            };

            // Forward the message to the appropriate service via Redis
            publisher.publish('game-actions', JSON.stringify({
                type: message.type,
                payload: payload
            }));

        } catch (error) {
            console.error('Failed to parse message or publish to Redis:', error);
            ws.send(JSON.stringify({ type: 'error', payload: { message: 'Invalid message format.' } }));
        }
    });

    // 5. --- Cleanup on Disconnection ---
    ws.on('close', async () => {
        console.log(`Client ${decodedToken.userId} (ID: ${connectionId}) disconnected.`);
        clients.delete(connectionId);

        // Decrement the subscription count for the game
        const currentSubs = gameSubscriptions.get(gameId);
        if (currentSubs) {
            if (currentSubs - 1 <= 0) {
                // If this was the last client for this game on this instance, unsubscribe
                await subscriber.unsubscribe(`game-updates:${gameId}`);
                gameSubscriptions.delete(gameId);
                console.log(`Unsubscribed from game-updates:${gameId}`);
            } else {
                gameSubscriptions.set(gameId, currentSubs - 1);
            }
        }
    });

    ws.on('error', (error) => {
        console.error(`WebSocket error for client ${connectionId}:`, error);
    });
});

// --- Interval to check for dead connections ---
const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
            console.log('Terminating dead connection.');
            return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
    });
}, 30000); // 30 seconds

wss.on('close', () => {
    clearInterval(interval);
});

// --- Connect Redis clients and start server ---
(async () => {
    try {
        await publisher.connect();
        await subscriber.connect();
        console.log('Connected to Redis.');
        console.log(`WebSocket Gateway Service listening on port ${PORT}`);
    } catch (err) {
        console.error('Failed to connect to Redis', err);
        process.exit(1);
    }
})();

