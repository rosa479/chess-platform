FROM node:18-alpine

# Install Stockfish
RUN apk add --no-cache stockfish curl

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Expose port
EXPOSE 3011

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3011/health || exit 1

# Start the service
CMD ["npm", "start"]
