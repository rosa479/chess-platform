# Chess Platform

A modern, real-time chess platform built with microservices architecture. Play chess online with friends, analyze games, and compete on the leaderboard.

## 🏗️ Architecture

The platform consists of 5 microservices:

- **User Service** (Port 3001) - Authentication, user management, profiles
- **Game Lifecycle Service** (Port 3002) - Game state management, move validation
- **Matchmaking Service** (Port 3003) - Player pairing, rating system
- **AI Analysis Service** (Port 3004) - Game analysis, engine integration
- **WebSocket Gateway Service** (Port 8080) - Real-time communication
- **React Client** (Port 3000) - Frontend application

## 🚀 Features

### Core Gameplay
- ✅ Real-time multiplayer chess
- ✅ Multiple time controls (Bullet, Blitz, Rapid, Classical)
- ✅ Move validation and game state management
- ✅ Time controls with increment support
- ✅ Game history and move list

### User Management
- ✅ User registration and authentication
- ✅ JWT-based authentication
- ✅ User profiles and statistics
- ✅ Rating system (ELO-based)
- ✅ Leaderboard

### Real-time Features
- ✅ WebSocket-based real-time communication
- ✅ Live game updates
- ✅ In-game chat
- ✅ Connection status indicators

### Matchmaking
- ✅ Intelligent player pairing
- ✅ Rating-based matchmaking
- ✅ Queue system with wait times
- ✅ Multiple time control options

### Analysis
- ✅ Position analysis
- ✅ Game analysis
- ✅ Opening book suggestions
- ✅ Move evaluation

## 🛠️ Technology Stack

### Backend Services
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Redis** - Caching and pub/sub messaging
- **WebSocket** - Real-time communication
- **JWT** - Authentication
- **Chess.js** - Chess logic and validation

### Frontend
- **React 18** - UI framework
- **Styled Components** - CSS-in-JS styling
- **Framer Motion** - Animations
- **Axios** - HTTP client
- **React Router** - Client-side routing

### Infrastructure
- **Docker** - Containerization
- **Redis** - Message broker and caching
- **Microservices** - Scalable architecture

## 📋 Prerequisites

- Node.js (v16 or higher)
- Redis server
- npm or yarn

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd chess-platform
```

### 2. Containerized Setup (Recommended)

#### Quick Setup Script
```bash
# Make setup script executable
chmod +x setup.sh

# Run complete setup
./setup.sh

# Development mode with hot reload
./setup.sh dev

# Production mode
./setup.sh prod

# Stop all services
./setup.sh stop

# Clean up everything
./setup.sh clean

# View logs
./setup.sh logs

# Check status
./setup.sh status
```

#### Using Docker Compose
```bash
# Build and start all services
docker compose up -d --build

# View logs
docker compose logs -f

# Stop all services
docker compose down

# Stop and remove volumes
docker compose down -v
```

#### Individual Service Management
```bash
# Start specific service
docker compose up -d user-service

# Restart service
docker compose restart user-service

# View service logs
docker compose logs -f user-service

# Scale service
docker compose up -d --scale user-service=2
```

#### Development with Hot Reload
```bash
# Start with volume mounts for development
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

### 3. Manual Setup (Alternative)

#### Start Redis Server
```bash
# Using Docker
docker run -d -p 6379:6379 redis:alpine

# Or install Redis locally
# Ubuntu/Debian: sudo apt-get install redis-server
# macOS: brew install redis
# Windows: Download from https://redis.io/download
```

#### Install Dependencies
```bash
# Install backend service dependencies
cd services/user-service && npm install
cd ../game-lifecycle-service && npm install
cd ../matchmaking-service && npm install
cd ../ai-analysis-service && npm install
cd ../websocket-gateway-service && npm install
cd ../tournament-service && npm install
cd ../computer-opponent-service && npm install
cd ../puzzle-service && npm install
cd ../learning-service && npm install
cd ../spectate-service && npm install
cd ../community-service && npm install
cd ../analysis-tools-service && npm install
cd ../rating-service && npm install
cd ../game-history-service && npm install

# Install frontend dependencies
cd ../../client && npm install

# Install shared dependencies
cd ../shared/validators && npm install
```

#### Environment Configuration
Copy and configure environment files:

```bash
# Copy example environment files
cp services/user-service/.env.example services/user-service/.env
cp services/game-lifecycle-service/.env.example services/game-lifecycle-service/.env
cp services/matchmaking-service/.env.example services/matchmaking-service/.env
cp services/ai-analysis-service/.env.example services/ai-analysis-service/.env
cp services/websocket-gateway-service/.env.example services/websocket-gateway-service/.env
cp services/tournament-service/.env.example services/tournament-service/.env
cp services/computer-opponent-service/.env.example services/computer-opponent-service/.env
cp services/puzzle-service/.env.example services/puzzle-service/.env
cp services/learning-service/.env.example services/learning-service/.env
cp services/spectate-service/.env.example services/spectate-service/.env
cp services/community-service/.env.example services/community-service/.env
cp services/analysis-tools-service/.env.example services/analysis-tools-service/.env
cp services/rating-service/.env.example services/rating-service/.env
cp services/game-history-service/.env.example services/game-history-service/.env
```

Update the `.env` files with your configuration (Redis URL, JWT secrets, etc.).

#### Start All Services Manually
```bash
# Terminal 1 - User Service
cd services/user-service && npm start

# Terminal 2 - Game Lifecycle Service
cd services/game-lifecycle-service && npm start

# Terminal 3 - Matchmaking Service
cd services/matchmaking-service && npm start

# Terminal 4 - AI Analysis Service
cd services/ai-analysis-service && npm start

# Terminal 5 - WebSocket Gateway Service
cd services/websocket-gateway-service && npm start

# Terminal 6 - Tournament Service
cd services/tournament-service && npm start

# Terminal 7 - Computer Opponent Service
cd services/computer-opponent-service && npm start

# Terminal 8 - Puzzle Service
cd services/puzzle-service && npm start

# Terminal 9 - Learning Service
cd services/learning-service && npm start

# Terminal 10 - Spectate Service
cd services/spectate-service && npm start

# Terminal 11 - Community Service
cd services/community-service && npm start

# Terminal 12 - Analysis Tools Service
cd services/analysis-tools-service && npm start

# Terminal 13 - Rating Service
cd services/rating-service && npm start

# Terminal 14 - Game History Service
cd services/game-history-service && npm start

# Terminal 15 - React Client
cd client && npm start
```

### 4. Access the Application
- **Frontend**: http://localhost:3000
- **User Service**: http://localhost:3001
- **Game Lifecycle Service**: http://localhost:3002
- **Matchmaking Service**: http://localhost:3003
- **AI Analysis Service**: http://localhost:3004
- **WebSocket Gateway**: ws://localhost:8080
- **Tournament Service**: http://localhost:3005
- **Computer Opponent Service**: http://localhost:3006
- **Puzzle Service**: http://localhost:3007
- **Learning Service**: http://localhost:3008
- **Spectate Service**: http://localhost:3009
- **Community Service**: http://localhost:3010
- **Analysis Tools Service**: http://localhost:3011
- **Rating Service**: http://localhost:3012
- **Game History Service**: http://localhost:3013

## 🐳 Docker Commands

### Basic Docker Commands
```bash
# Build all services
docker compose build

# Start all services in background
docker compose up -d

# Start with build (recommended for first run)
docker compose up -d --build

# View all running containers
docker compose ps

# View logs for all services
docker compose logs -f

# View logs for specific service
docker compose logs -f user-service

# Stop all services
docker compose down

# Stop and remove volumes (clean slate)
docker compose down -v

# Restart specific service
docker compose restart user-service

# Scale service (run multiple instances)
docker compose up -d --scale user-service=2
```

### Development Commands
```bash
# Start with hot reload (mounts source code)
docker compose up -d --build

# Rebuild specific service
docker compose build user-service
docker compose up -d user-service

# Execute command in running container
docker compose exec user-service sh

# View container resource usage
docker stats

# Clean up unused containers and images
docker system prune -a
```

### Production Commands
```bash
# Build for production
docker compose -f docker-compose.yml -f docker-compose.prod.yml build

# Start production environment
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Update services (zero-downtime)
docker compose pull
docker compose up -d --no-deps user-service
```

### Troubleshooting Commands
```bash
# Check service health
docker compose ps

# View service logs
docker compose logs user-service

# Check Redis connection
docker compose exec redis redis-cli ping

# Restart all services
docker compose restart

# Remove and recreate containers
docker compose down
docker compose up -d --force-recreate
```

## 🎮 How to Play

1. **Register/Login**: Create an account or login with existing credentials
2. **Choose Time Control**: Select your preferred time control (Bullet, Blitz, Rapid, Classical)
3. **Find Opponent**: Click "Find Game" to join the matchmaking queue
4. **Play**: Make moves by clicking and dragging pieces or clicking source and destination squares
5. **Chat**: Communicate with your opponent using the in-game chat
6. **Analyze**: Review your games and analyze positions

## 🔧 API Endpoints

### User Service (Port 3001)
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /users/:userId` - Get user profile
- `PUT /users/:userId` - Update user profile
- `GET /leaderboard` - Get leaderboard

### Game Lifecycle Service (Port 3002)
- `POST /games` - Create new game
- `GET /games/:gameId` - Get game state
- `POST /games/:gameId/move` - Make a move

### Matchmaking Service (Port 3003)
- `POST /matchmaking/join` - Join matchmaking queue
- `POST /matchmaking/leave` - Leave matchmaking queue
- `GET /matchmaking/status/:userId` - Get queue status
- `GET /matchmaking/time-controls` - Get available time controls

### AI Analysis Service (Port 3004)
- `POST /analyze` - Analyze position
- `POST /analyze-game` - Analyze complete game
- `GET /opening-book` - Get opening suggestions

## 🧪 Testing

```bash
# Run tests for each service
cd services/user-service && npm test
cd services/game-lifecycle-service && npm test
cd services/matchmaking-service && npm test
cd services/ai-analysis-service && npm test
cd services/websocket-gateway-service && npm test

# Run frontend tests
cd client && npm test
```

## 📊 Monitoring

Each service provides health check endpoints:
- `GET /health` - Service health status

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Input validation and sanitization
- Rate limiting
- CORS configuration
- Secure WebSocket connections

## 🚀 Deployment

### Production Deployment
1. Set up a Redis cluster
2. Configure environment variables for production
3. Use a process manager like PM2
4. Set up reverse proxy (nginx)
5. Configure SSL certificates
6. Set up monitoring and logging

### Environment Variables for Production
```bash
NODE_ENV=production
REDIS_URL=redis://your-redis-cluster:6379
JWT_SECRET=your-super-secure-secret-key
LOG_LEVEL=info
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🐛 Troubleshooting

### Common Issues

1. **Redis Connection Error**
   - Ensure Redis server is running
   - Check Redis URL in environment variables

2. **WebSocket Connection Failed**
   - Verify WebSocket gateway service is running
   - Check firewall settings
   - Ensure JWT token is valid

3. **Service Communication Issues**
   - Verify all services are running
   - Check service URLs in environment variables
   - Ensure Redis pub/sub is working

4. **Frontend Build Issues**
   - Clear node_modules and reinstall
   - Check Node.js version compatibility
   - Verify environment variables

### Logs
Check service logs for detailed error information:
```bash
# View logs for each service
cd services/user-service && npm run logs
cd services/game-lifecycle-service && npm run logs
# ... etc
```

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Check the troubleshooting section
- Review service logs

---

**Happy Chess Playing! ♟️**
