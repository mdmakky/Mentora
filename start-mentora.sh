#!/bin/bash

# Mentora - Complete Startup Script
# This script starts both the FastAPI backend and React frontend

set -e  # Exit on any error

echo "🚀 Starting Mentora Application..."
echo "=================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the project root directory
PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$PROJECT_ROOT"

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo -e "${YELLOW}⚠️  Virtual environment not found!${NC}"
    echo "Creating virtual environment..."
    python3 -m venv .venv
    echo -e "${GREEN}✅ Virtual environment created${NC}"
fi

# Check if backend dependencies are installed
echo -e "${BLUE}📦 Checking backend dependencies...${NC}"
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found in backend/${NC}"
    echo "Please create backend/.env with required configuration"
    exit 1
fi

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down servers...${NC}"
    pkill -f "uvicorn app.main:app" 2>/dev/null || true
    pkill -f "react-scripts start" 2>/dev/null || true
    echo -e "${GREEN}✅ Servers stopped${NC}"
    exit 0
}

# Register cleanup function
trap cleanup SIGINT SIGTERM

# Start FastAPI Backend
echo -e "${BLUE}🔧 Starting FastAPI Backend...${NC}"
cd "$PROJECT_ROOT/backend"

# Activate virtual environment and start backend
PYTHONPATH="$PROJECT_ROOT/backend" "$PROJECT_ROOT/.venv/bin/uvicorn" app.main:app \
    --reload \
    --host 0.0.0.0 \
    --port 8000 \
    > "$PROJECT_ROOT/backend.log" 2>&1 &

BACKEND_PID=$!
echo -e "${GREEN}✅ Backend started (PID: $BACKEND_PID)${NC}"
echo -e "   URL: ${BLUE}http://localhost:8000${NC}"
echo -e "   Docs: ${BLUE}http://localhost:8000/docs${NC}"
echo -e "   Logs: ${BLUE}backend.log${NC}"

# Wait for backend to start
echo -e "${YELLOW}⏳ Waiting for backend to initialize...${NC}"
sleep 3

# Check if backend is running
if ! curl -s http://localhost:8000/api/auth/register/ > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Backend may not be ready yet. Check backend.log for errors${NC}"
fi

# Start React Frontend
echo -e "\n${BLUE}⚛️  Starting React Frontend...${NC}"
cd "$PROJECT_ROOT/frontend"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  node_modules not found. Installing dependencies...${NC}"
    npm install
fi

# Start frontend
BROWSER=none npm start > "$PROJECT_ROOT/frontend.log" 2>&1 &
FRONTEND_PID=$!

echo -e "${GREEN}✅ Frontend started (PID: $FRONTEND_PID)${NC}"
echo -e "   URL: ${BLUE}http://localhost:3000${NC}"
echo -e "   Logs: ${BLUE}frontend.log${NC}"

echo -e "\n${GREEN}=================================="
echo -e "✅ Mentora is running!${NC}"
echo -e "==================================\n"
echo -e "📱 Frontend: ${BLUE}http://localhost:3000${NC}"
echo -e "🔧 Backend:  ${BLUE}http://localhost:8000${NC}"
echo -e "📚 API Docs: ${BLUE}http://localhost:8000/docs${NC}"
echo -e "\n${YELLOW}Press Ctrl+C to stop all servers${NC}\n"

# Wait for user interrupt
wait
