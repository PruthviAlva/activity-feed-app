#!/bin/bash

# Activity Feed - Quick Setup & Test Script
# Run this script to automatically setup and test the entire application

set -e

echo "🚀 Activity Feed - Complete Setup Script"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}▶${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check prerequisites
print_status "Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 16+"
    exit 1
fi
print_success "Node.js installed: $(node -v)"

if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Please install npm"
    exit 1
fi
print_success "npm installed: $(npm -v)"

echo ""

# Backend setup
print_status "Setting up Backend..."
cd backend

if [ ! -f .env ]; then
    print_warning ".env not found, creating from .env.example..."
    cp .env.example .env
    echo "MONGODB_URI=mongodb://localhost:27017/activity-feed" >> .env
    echo "NODE_ENV=development" >> .env
fi
print_success ".env configured"

if [ ! -d node_modules ]; then
    print_status "Installing backend dependencies..."
    npm install
    print_success "Backend dependencies installed"
else
    print_success "Backend dependencies already installed"
fi

cd ..
echo ""

# Frontend setup
print_status "Setting up Frontend..."
cd frontend

if [ ! -f .env ]; then
    print_warning ".env not found, creating from .env.example..."
    cp .env.example .env
fi
print_success ".env configured"

if [ ! -d node_modules ]; then
    print_status "Installing frontend dependencies..."
    npm install
    print_success "Frontend dependencies installed"
else
    print_success "Frontend dependencies already installed"
fi

cd ..
echo ""

# Summary
echo "========================================"
echo -e "${GREEN}✨ Setup Complete!${NC}"
echo "========================================"
echo ""
echo "📦 PROJECT STRUCTURE:"
echo "   Backend:  $(pwd)/backend (Express API)"
echo "   Frontend: $(pwd)/frontend (React App)"
echo ""
echo "🚀 TO START DEVELOPMENT:"
echo ""
echo "   Terminal 1 - Backend:"
echo "   $ cd backend && npm run dev"
echo "   → Runs on http://localhost:5000"
echo ""
echo "   Terminal 2 - Frontend:"
echo "   $ cd frontend && npm run dev"
echo "   → Runs on http://localhost:3000"
echo ""
echo "🐳 OR USE DOCKER COMPOSE:"
echo "   $ docker-compose up"
echo "   → All services start automatically"
echo ""
echo "📚 DOCUMENTATION:"
echo "   • README.md - Setup & overview"
echo "   • SYSTEM_DESIGN.md - Scaling guide"
echo "   • PERFORMANCE_DEBUGGING.md - Query optimization"
echo "   • CODE_REVIEW.md - React patterns"
echo "   • EVENT_DRIVEN_ARCHITECTURE.md - Async design"
echo ""
echo "🧪 QUICK TESTS:"
echo "   Create Activity:"
echo "   $ curl -X POST http://localhost:5000/api/activities \\"
echo "     -H 'Content-Type: application/json' -d '{\"tenantId\":\"tenant-1\",\"actorId\":\"user-1\",\"actorName\":\"Alice\",\"type\":\"create\",\"entityId\":\"post-1\"}'"
echo ""
echo "   Fetch Activities:"
echo "   $ curl 'http://localhost:5000/api/activities?tenantId=tenant-1&limit=20'"
echo ""
echo "   Health Check:"
echo "   $ curl http://localhost:5000/health"
echo ""
echo "✅ Everything is ready! Happy coding! 🎉"
