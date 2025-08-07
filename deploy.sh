#!/bin/bash

# Aya Wallet MCP Deployment Script
# This script sets up and deploys the MCP server for the Aya AI Hackathon

set -e

echo "🚀 Aya Wallet MCP Deployment Script"
echo "====================================="

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

# Check if Node.js is installed
check_nodejs() {
    print_status "Checking Node.js installation..."
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node -v)"
        exit 1
    fi
    
    print_success "Node.js $(node -v) is installed"
}

# Check if npm is installed
check_npm() {
    print_status "Checking npm installation..."
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    print_success "npm $(npm -v) is installed"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    npm install
    print_success "Dependencies installed successfully"
}

# Build the project
build_project() {
    print_status "Building the project..."
    npm run build
    print_success "Project built successfully"
}

# Check environment variables
check_environment() {
    print_status "Checking environment variables..."
    
    if [ ! -f ".env" ]; then
        print_warning ".env file not found. Creating from template..."
        if [ -f "env.example" ]; then
            cp env.example .env
            print_warning "Please edit .env file with your credentials before continuing"
            print_warning "Required variables:"
            print_warning "  - OPENAI_API_KEY (from Comput3)"
            print_warning "  - HEDERA_OPERATOR_ID"
            print_warning "  - HEDERA_OPERATOR_KEY"
            print_warning "  - JWT_SECRET (32+ characters)"
            print_warning "  - ENCRYPTION_KEY (32+ characters)"
            exit 1
        else
            print_error "env.example file not found"
            exit 1
        fi
    fi
    
    # Check required environment variables
    source .env
    
    REQUIRED_VARS=(
        "OPENAI_API_KEY"
        "HEDERA_OPERATOR_ID"
        "HEDERA_OPERATOR_KEY"
        "JWT_SECRET"
        "ENCRYPTION_KEY"
    )
    
    for var in "${REQUIRED_VARS[@]}"; do
        if [ -z "${!var}" ]; then
            print_error "Required environment variable $var is not set"
            exit 1
        fi
    done
    
    print_success "Environment variables are properly configured"
}

# Run tests
run_tests() {
    print_status "Running tests..."
    if npm test; then
        print_success "All tests passed"
    else
        print_warning "Some tests failed, but continuing with deployment"
    fi
}

# Start the server
start_server() {
    print_status "Starting MCP server..."
    
    # Check if server is already running
    if pgrep -f "aya-wallet-mcp" > /dev/null; then
        print_warning "MCP server is already running. Stopping it first..."
        pkill -f "aya-wallet-mcp"
        sleep 2
    fi
    
    # Start the server in background
    nohup node dist/index.js > logs/mcp-server.log 2>&1 &
    SERVER_PID=$!
    
    # Wait a moment for server to start
    sleep 3
    
    # Check if server started successfully
    if kill -0 $SERVER_PID 2>/dev/null; then
        print_success "MCP server started successfully (PID: $SERVER_PID)"
        echo $SERVER_PID > .server.pid
    else
        print_error "Failed to start MCP server"
        exit 1
    fi
}

# Docker deployment
deploy_docker() {
    print_status "Deploying with Docker..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Build and start containers
    docker-compose up -d --build
    
    print_success "Docker deployment completed"
    print_status "You can view logs with: docker-compose logs -f"
}

# Health check
health_check() {
    print_status "Performing health check..."
    
    # Wait for server to be ready
    sleep 5
    
    # Test the server
    if node test-mcp.js; then
        print_success "Health check passed"
    else
        print_error "Health check failed"
        exit 1
    fi
}

# Main deployment function
main() {
    echo ""
    print_status "Starting deployment process..."
    
    # Create logs directory
    mkdir -p logs
    
    # Run checks
    check_nodejs
    check_npm
    check_environment
    
    # Install and build
    install_dependencies
    build_project
    
    # Run tests
    run_tests
    
    # Choose deployment method
    echo ""
    echo "Choose deployment method:"
    echo "1) Local deployment (recommended for development)"
    echo "2) Docker deployment (recommended for production)"
    echo "3) Both"
    read -p "Enter your choice (1-3): " choice
    
    case $choice in
        1)
            start_server
            health_check
            ;;
        2)
            deploy_docker
            health_check
            ;;
        3)
            start_server
            deploy_docker
            health_check
            ;;
        *)
            print_error "Invalid choice"
            exit 1
            ;;
    esac
    
    echo ""
    print_success "🎉 Deployment completed successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Configure ElizaOS to use this MCP server"
    echo "2. Test the integration with Comput3 GPU"
    echo "3. Deploy to production environment"
    echo ""
    echo "📚 Documentation: README.md"
    echo "🐛 Issues: GitHub Issues"
    echo "💬 Support: Discord community"
    echo ""
}

# Handle script arguments
case "${1:-}" in
    "docker")
        check_environment
        deploy_docker
        ;;
    "local")
        check_environment
        start_server
        health_check
        ;;
    "test")
        run_tests
        ;;
    "health")
        health_check
        ;;
    "stop")
        if [ -f ".server.pid" ]; then
            PID=$(cat .server.pid)
            if kill -0 $PID 2>/dev/null; then
                kill $PID
                rm .server.pid
                print_success "MCP server stopped"
            else
                print_warning "Server not running"
            fi
        else
            print_warning "No server PID file found"
        fi
        ;;
    *)
        main
        ;;
esac 