#!/bin/bash

# Helfy Assignment Setup Script
# This script sets up the complete full-stack application

set -e

echo "🚀 Starting Helfy Assignment Setup..."

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

# Check if Docker is installed and running
check_docker() {
    print_status "Checking Docker installation..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker and try again."
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    
    print_success "Docker is installed and running"
}

# Check if Docker Compose is available
check_docker_compose() {
    print_status "Checking Docker Compose..."
    
    if docker compose version &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker compose"
    elif docker-compose --version &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker-compose"
    else
        print_error "Docker Compose is not available. Please install Docker Compose and try again."
        exit 1
    fi
    
    print_success "Docker Compose is available: $DOCKER_COMPOSE_CMD"
}

# Clean up existing containers and volumes
cleanup() {
    print_status "Cleaning up existing containers and volumes..."
    
    $DOCKER_COMPOSE_CMD down --volumes --remove-orphans 2>/dev/null || true
    
    # Remove any existing images to ensure fresh build
    docker image prune -f 2>/dev/null || true
    
    print_success "Cleanup completed"
}

# Build and start the application
start_application() {
    print_status "Building and starting the application..."
    
    # Build the application with no cache
    print_status "Building Docker images..."
    $DOCKER_COMPOSE_CMD build --no-cache
    
    # Start the services
    print_status "Starting services..."
    $DOCKER_COMPOSE_CMD up -d
    
    print_success "Application started successfully"
}

# Wait for services to be healthy
wait_for_services() {
    print_status "Waiting for services to be healthy..."
    
    local max_attempts=60
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        attempt=$((attempt + 1))
        
        # Check TiDB
        if curl -f -s http://localhost:10080/status > /dev/null 2>&1; then
            tidb_healthy=true
        else
            tidb_healthy=false
        fi
        
        # Check Backend API
        if curl -f -s http://localhost:3001/api/health > /dev/null 2>&1; then
            backend_healthy=true
        else
            backend_healthy=false
        fi
        
        # Check Frontend
        if curl -f -s http://localhost:3000 > /dev/null 2>&1; then
            frontend_healthy=true
        else
            frontend_healthy=false
        fi
        
        # Check Consumer
        if curl -f -s http://localhost:3003/health > /dev/null 2>&1; then
            consumer_healthy=true
        else
            consumer_healthy=false
        fi
        
        if [ "$tidb_healthy" = true ] && [ "$backend_healthy" = true ] && [ "$frontend_healthy" = true ] && [ "$consumer_healthy" = true ]; then
            print_success "All services are healthy!"
            return 0
        fi
        
        if [ $((attempt % 10)) -eq 0 ]; then
            print_status "Still waiting for services... (attempt $attempt/$max_attempts)"
            print_status "  TiDB: $([ "$tidb_healthy" = true ] && echo "✅" || echo "❌")"
            print_status "  Backend: $([ "$backend_healthy" = true ] && echo "✅" || echo "❌")"
            print_status "  Frontend: $([ "$frontend_healthy" = true ] && echo "✅" || echo "❌")"
            print_status "  Consumer: $([ "$consumer_healthy" = true ] && echo "✅" || echo "❌")"
        fi
        
        sleep 5
    done
    
    print_warning "Services are taking longer than expected to start. Check logs with: $DOCKER_COMPOSE_CMD logs"
    return 1
}

# Display application information
show_application_info() {
    echo ""
    echo "🎉 Helfy Assignment Application is running!"
    echo ""
    echo "📊 Service URLs:"
    echo "  Frontend (React):     http://localhost:3000"
    echo "  Backend API:          http://localhost:3001"
    echo "  TiDB Status:          http://localhost:10080/status"
    echo ""
    echo "🔐 Default Login Credentials:"
    echo "  Username: admin"
    echo "  Password: admin123"
    echo ""
    echo "🛠️  Management Commands:"
    echo "  View logs:            $DOCKER_COMPOSE_CMD logs -f"
    echo "  Stop application:     $DOCKER_COMPOSE_CMD down"
    echo "  Restart:              $DOCKER_COMPOSE_CMD restart"
    echo "  Clean shutdown:       $DOCKER_COMPOSE_CMD down --volumes"
    echo ""
    echo "📋 Architecture Components:"
    echo "  ✅ Frontend: React Application (Port 3000)"
    echo "  ✅ Backend: Node.js + Express API (Port 3001)"
    echo "  ✅ Database: TiDB (Port 4000)"
    echo "  ✅ Message Queue: Apache Kafka (Port 9092)"
    echo "  ✅ Consumer: Kafka Consumer Service (Port 3003)"
    echo "  ✅ Logging: log4js structured logging"
    echo "  ✅ Authentication: JWT-based auth"
    echo "  ✅ Monitoring: Database change capture"
    echo ""
    echo "🔍 Health Check URLs:"
    echo "  Backend API:    curl http://localhost:3001/api/health"
    echo "  TiDB:           curl http://localhost:10080/status"
    echo "  Consumer:       curl http://localhost:3003/health"
    echo ""
}

# Main execution
main() {
    echo "=================================="
    echo "    Helfy Assignment Setup"
    echo "=================================="
    echo ""
    
    check_docker
    check_docker_compose
    cleanup
    start_application
    wait_for_services
    show_application_info
    
    echo "✨ Setup completed successfully!"
    echo ""
    echo "You can now access the application at http://localhost:3000"
    echo ""
}

# Execute main function
main "$@"
