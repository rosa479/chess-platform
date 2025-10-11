#!/bin/bash

# Chess Platform Setup Script
# This script sets up the complete chess platform with Docker

set -e

echo "🏗️  Chess Platform Setup"
echo "========================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
check_docker() {
    print_status "Checking Docker installation..."
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        echo "Visit: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        echo "Visit: https://docs.docker.com/compose/install/"
        exit 1
    fi
    
    print_success "Docker and Docker Compose are installed"
}

# Check if Docker daemon is running
check_docker_daemon() {
    print_status "Checking Docker daemon..."
    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running. Please start Docker."
        exit 1
    fi
    print_success "Docker daemon is running"
}

# Create environment files
create_env_files() {
    print_status "Creating environment files..."
    
    # List of services
    services=(
        "user-service"
        "game-lifecycle-service"
        "matchmaking-service"
        "ai-analysis-service"
        "websocket-gateway-service"
        "tournament-service"
        "computer-opponent-service"
        "puzzle-service"
        "learning-service"
        "spectate-service"
        "community-service"
        "analysis-tools-service"
        "rating-service"
        "game-history-service"
    )
    
    for service in "${services[@]}"; do
        if [ -f "services/$service/.env.example" ] && [ ! -f "services/$service/.env" ]; then
            cp "services/$service/.env.example" "services/$service/.env"
            print_success "Created .env for $service"
        fi
    done
}

# Build and start services
start_services() {
    print_status "Building and starting services..."
    
    # Build all services
    print_status "Building Docker images..."
    docker-compose build
    
    # Start all services
    print_status "Starting services..."
    docker-compose up -d
    
    print_success "All services started successfully!"
}

# Wait for services to be healthy
wait_for_services() {
    print_status "Waiting for services to be healthy..."
    
    services=(
        "redis"
        "user-service"
        "game-lifecycle-service"
        "matchmaking-service"
        "ai-analysis-service"
        "websocket-gateway-service"
        "tournament-service"
        "computer-opponent-service"
        "puzzle-service"
        "learning-service"
        "spectate-service"
        "community-service"
        "analysis-tools-service"
        "rating-service"
        "game-history-service"
        "client"
    )
    
    for service in "${services[@]}"; do
        print_status "Waiting for $service to be healthy..."
        timeout=60
        while [ $timeout -gt 0 ]; do
            if docker-compose ps $service | grep -q "healthy\|Up"; then
                print_success "$service is healthy"
                break
            fi
            sleep 2
            timeout=$((timeout - 2))
        done
        
        if [ $timeout -le 0 ]; then
            print_warning "$service may not be fully ready yet"
        fi
    done
}

# Display service status
show_status() {
    print_status "Service Status:"
    docker-compose ps
    
    echo ""
    print_success "🎉 Chess Platform is ready!"
    echo ""
    echo "📱 Access the application at: http://localhost:3000"
    echo ""
    echo "🔧 Service URLs:"
    echo "   - Frontend: http://localhost:3000"
    echo "   - User Service: http://localhost:3001"
    echo "   - Game Service: http://localhost:3002"
    echo "   - Matchmaking: http://localhost:3003"
    echo "   - AI Analysis: http://localhost:3004"
    echo "   - WebSocket: ws://localhost:8080"
    echo "   - Tournaments: http://localhost:3005"
    echo "   - Computer: http://localhost:3006"
    echo "   - Puzzles: http://localhost:3007"
    echo "   - Learning: http://localhost:3008"
    echo "   - Spectate: http://localhost:3009"
    echo "   - Community: http://localhost:3010"
    echo "   - Analysis: http://localhost:3011"
    echo "   - Rating: http://localhost:3012"
    echo "   - History: http://localhost:3013"
    echo ""
    echo "📋 Useful Commands:"
    echo "   - View logs: docker-compose logs -f"
    echo "   - Stop services: docker-compose down"
    echo "   - Restart: docker-compose restart"
    echo "   - Clean up: docker-compose down -v"
}

# Main execution
main() {
    echo "Starting Chess Platform setup..."
    echo ""
    
    check_docker
    check_docker_daemon
    create_env_files
    start_services
    wait_for_services
    show_status
    
    echo ""
    print_success "Setup completed successfully! 🎉"
}

# Handle script arguments
case "${1:-}" in
    "dev")
        print_status "Starting in development mode..."
        docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
        ;;
    "prod")
        print_status "Starting in production mode..."
        docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
        ;;
    "stop")
        print_status "Stopping all services..."
        docker-compose down
        print_success "All services stopped"
        ;;
    "clean")
        print_status "Cleaning up..."
        docker-compose down -v
        docker system prune -f
        print_success "Cleanup completed"
        ;;
    "logs")
        docker-compose logs -f
        ;;
    "status")
        docker-compose ps
        ;;
    *)
        main
        ;;
esac
