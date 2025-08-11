#!/bin/bash

# AWY Deployment Script
# This script helps deploy the Always With You system

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-production}
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"

echo -e "${BLUE}🚀 AWY Deployment Script${NC}"
echo -e "${BLUE}=========================${NC}"
echo ""

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_status "Docker and Docker Compose are installed"
}

# Check if environment file exists
check_env_file() {
    if [ ! -f "$ENV_FILE" ]; then
        print_warning "Environment file $ENV_FILE not found"
        
        if [ -f ".env.production" ]; then
            print_info "Copying .env.production to $ENV_FILE"
            cp .env.production $ENV_FILE
            print_warning "Please edit $ENV_FILE with your actual configuration values"
            print_info "Press Enter to continue after editing the file..."
            read
        else
            print_error "No environment template found. Please create $ENV_FILE"
            exit 1
        fi
    fi
    
    print_status "Environment file found"
}

# Generate SSL certificates (self-signed for development)
generate_ssl_certs() {
    if [ ! -d "infra/ssl" ]; then
        mkdir -p infra/ssl
    fi
    
    if [ ! -f "infra/ssl/awy.crt" ] || [ ! -f "infra/ssl/awy.key" ]; then
        print_info "Generating self-signed SSL certificates..."
        
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout infra/ssl/awy.key \
            -out infra/ssl/awy.crt \
            -subj "/C=US/ST=State/L=City/O=AWY/CN=awy.example.com" \
            -addext "subjectAltName=DNS:awy.example.com,DNS:widget.awy.example.com,DNS:admin.awy.example.com"
        
        print_status "SSL certificates generated"
        print_warning "Using self-signed certificates. For production, use proper SSL certificates."
    else
        print_status "SSL certificates already exist"
    fi
}

# Build Docker images
build_images() {
    print_info "Building Docker images..."
    
    docker-compose build --parallel
    
    print_status "Docker images built successfully"
}

# Start services
start_services() {
    print_info "Starting AWY services..."
    
    # Start database and cache first
    docker-compose up -d postgres redis
    
    # Wait for database to be ready
    print_info "Waiting for database to be ready..."
    sleep 10
    
    # Run database migrations
    print_info "Running database migrations..."
    docker-compose run --rm server pnpm run db:migrate
    
    # Start all services
    docker-compose up -d
    
    print_status "All services started"
}

# Check service health
check_health() {
    print_info "Checking service health..."
    
    # Wait a bit for services to start
    sleep 15
    
    # Check each service
    services=("server:3001/health" "widget:80/health" "admin:80/health")
    
    for service in "${services[@]}"; do
        if curl -f -s "http://localhost:${service#*:}" > /dev/null; then
            print_status "${service%:*} is healthy"
        else
            print_warning "${service%:*} health check failed"
        fi
    done
}

# Show service URLs
show_urls() {
    echo ""
    echo -e "${BLUE}🌐 Service URLs${NC}"
    echo -e "${BLUE}===============${NC}"
    echo -e "API Server:     ${GREEN}http://localhost:3001${NC}"
    echo -e "Widget:         ${GREEN}http://localhost:3000${NC}"
    echo -e "Admin Console:  ${GREEN}http://localhost:3002${NC}"
    echo -e "Prometheus:     ${GREEN}http://localhost:9090${NC}"
    echo -e "Grafana:        ${GREEN}http://localhost:3003${NC} (admin/admin)"
    echo ""
    echo -e "${YELLOW}Note: For HTTPS access, configure your hosts file:${NC}"
    echo -e "127.0.0.1 awy.example.com"
    echo -e "127.0.0.1 widget.awy.example.com"
    echo -e "127.0.0.1 admin.awy.example.com"
    echo ""
}

# Show logs
show_logs() {
    print_info "Showing service logs (Ctrl+C to exit)..."
    docker-compose logs -f
}

# Stop services
stop_services() {
    print_info "Stopping AWY services..."
    docker-compose down
    print_status "Services stopped"
}

# Clean up (remove containers and volumes)
cleanup() {
    print_warning "This will remove all containers and data. Are you sure? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        print_info "Cleaning up..."
        docker-compose down -v --remove-orphans
        docker system prune -f
        print_status "Cleanup completed"
    else
        print_info "Cleanup cancelled"
    fi
}

# Main deployment function
deploy() {
    print_info "Starting AWY deployment for $ENVIRONMENT environment"
    
    check_docker
    check_env_file
    generate_ssl_certs
    build_images
    start_services
    check_health
    show_urls
    
    print_status "AWY deployment completed successfully!"
    echo ""
    print_info "To view logs: ./deploy.sh logs"
    print_info "To stop services: ./deploy.sh stop"
    print_info "To clean up: ./deploy.sh cleanup"
}

# Handle command line arguments
case "${2:-deploy}" in
    "deploy")
        deploy
        ;;
    "build")
        check_docker
        build_images
        ;;
    "start")
        check_docker
        start_services
        ;;
    "stop")
        stop_services
        ;;
    "restart")
        stop_services
        sleep 2
        start_services
        ;;
    "logs")
        show_logs
        ;;
    "health")
        check_health
        ;;
    "urls")
        show_urls
        ;;
    "cleanup")
        cleanup
        ;;
    *)
        echo "Usage: $0 [environment] [command]"
        echo ""
        echo "Environment: production (default), development"
        echo ""
        echo "Commands:"
        echo "  deploy    - Full deployment (default)"
        echo "  build     - Build Docker images only"
        echo "  start     - Start services"
        echo "  stop      - Stop services"
        echo "  restart   - Restart services"
        echo "  logs      - Show service logs"
        echo "  health    - Check service health"
        echo "  urls      - Show service URLs"
        echo "  cleanup   - Remove all containers and data"
        echo ""
        echo "Examples:"
        echo "  $0                    # Deploy with default settings"
        echo "  $0 production deploy  # Deploy to production"
        echo "  $0 production logs    # Show production logs"
        echo "  $0 production stop    # Stop production services"
        ;;
esac

