#!/bin/bash

# Start script for Frontend (React/TypeScript app and Node server)
# This script builds TypeScript files and starts the Node server

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/modules/frontend"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Frontend Application...${NC}"

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down services...${NC}"
    kill $SERVER_PID 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

# Check if frontend directory exists
if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}Error: Frontend directory not found at $FRONTEND_DIR${NC}"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo -e "${YELLOW}Warning: node_modules not found. Installing dependencies...${NC}"
    cd "$FRONTEND_DIR"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Failed to install dependencies${NC}"
        exit 1
    fi
fi

# Check if port 3001 is already in use
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}Warning: Port 3001 is already in use${NC}"
    echo -e "${YELLOW}Killing existing process on port 3001...${NC}"
    lsof -ti:3001 | xargs kill -9 2>/dev/null
    sleep 1
fi

# Check for dev mode flag
DEV_MODE=false
if [ "$1" == "--dev" ] || [ "$1" == "-d" ]; then
    DEV_MODE=true
    echo -e "${GREEN}Starting in development mode...${NC}"
fi

cd "$FRONTEND_DIR"

# Build TypeScript files if not in dev mode or if dist doesn't exist
if [ "$DEV_MODE" = false ] || [ ! -d "$FRONTEND_DIR/dist" ]; then
    echo -e "${GREEN}Building TypeScript files...${NC}"
    npm run build
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Failed to build TypeScript files${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ TypeScript build completed${NC}"
fi

# Start the server
if [ "$DEV_MODE" = true ]; then
    echo -e "${GREEN}Starting Node server in development mode (port 3001)...${NC}"
    echo -e "${YELLOW}Note: Server will auto-reload on file changes${NC}"
    npm run dev > "$SCRIPT_DIR/frontend.log" 2>&1 &
    SERVER_PID=$!
else
    echo -e "${GREEN}Starting Node server (port 3001)...${NC}"
    npm start > "$SCRIPT_DIR/frontend.log" 2>&1 &
    SERVER_PID=$!
fi

# Wait a moment for server to start
sleep 3

# Check if server started successfully
if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo -e "${RED}Error: Node server failed to start${NC}"
    echo -e "${RED}Check frontend.log for details${NC}"
    cat "$SCRIPT_DIR/frontend.log" 2>/dev/null | tail -20
    exit 1
fi

# Verify server is responding
if ! curl -s http://localhost:3001 > /dev/null 2>&1; then
    echo -e "${YELLOW}Warning: Server may still be starting up...${NC}"
    echo -e "${YELLOW}Waiting a bit longer...${NC}"
    sleep 2
    if ! curl -s http://localhost:3001 > /dev/null 2>&1; then
        echo -e "${RED}Error: Node server is not responding${NC}"
        echo -e "${RED}Check frontend.log for details${NC}"
        cat "$SCRIPT_DIR/frontend.log" 2>/dev/null | tail -20
        kill $SERVER_PID 2>/dev/null
        exit 1
    fi
fi

echo -e "${GREEN}✓ Node server started (PID: $SERVER_PID)${NC}"
echo -e "\n${GREEN}✓ Frontend is running!${NC}"
echo -e "${GREEN}Frontend: http://localhost:3001${NC}"
echo -e "\n${YELLOW}Logs are available in:${NC}"
echo -e "${YELLOW}  - frontend.log${NC}"
echo -e "\n${YELLOW}Press Ctrl+C to stop the server${NC}"

# Wait for process
wait

