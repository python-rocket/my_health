#!/bin/bash

# Start script for My Health application
# Starts both frontend and FastAPI backend services

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/modules/frontend"
AI_DOCTOR_DIR="$SCRIPT_DIR/modules/ai_doctor"
YOUTUBE_SUMMARIZER_DIR="$SCRIPT_DIR/modules/youtube_summarizer"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting My Health Application...${NC}"

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down services...${NC}"
    kill $FRONTEND_PID $API_PID 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

# Check if frontend directory exists
if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}Error: Frontend directory not found at $FRONTEND_DIR${NC}"
    exit 1
fi

# Check if ai_doctor directory exists
if [ ! -d "$AI_DOCTOR_DIR" ]; then
    echo -e "${RED}Error: AI Doctor directory not found at $AI_DOCTOR_DIR${NC}"
    exit 1
fi

# Check if youtube_summarizer directory exists (needed for dependencies)
if [ ! -d "$YOUTUBE_SUMMARIZER_DIR" ]; then
    echo -e "${RED}Error: YouTube summarizer directory not found at $YOUTUBE_SUMMARIZER_DIR${NC}"
    exit 1
fi

# Check if ports are already in use
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}Warning: Port 3001 is already in use${NC}"
    echo -e "${YELLOW}Killing existing process on port 3001...${NC}"
    lsof -ti:3001 | xargs kill -9 2>/dev/null
    sleep 1
fi

if lsof -Pi :3002 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}Warning: Port 3002 is already in use${NC}"
    echo -e "${YELLOW}Killing existing process on port 3002...${NC}"
    lsof -ti:3002 | xargs kill -9 2>/dev/null
    sleep 1
fi

# Start Frontend Server
echo -e "${GREEN}Starting Frontend Server (port 3001)...${NC}"
cd "$FRONTEND_DIR"
npm start > "$SCRIPT_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!

# Wait a moment for frontend to start
sleep 3

# Check if frontend started successfully
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo -e "${RED}Error: Frontend server failed to start${NC}"
    echo -e "${RED}Check frontend.log for details${NC}"
    exit 1
fi

# Verify frontend is responding
if ! curl -s http://localhost:3001 > /dev/null 2>&1; then
    echo -e "${RED}Error: Frontend server is not responding${NC}"
    echo -e "${RED}Check frontend.log for details${NC}"
    kill $FRONTEND_PID 2>/dev/null
    exit 1
fi

echo -e "${GREEN}Frontend server started (PID: $FRONTEND_PID)${NC}"

# Start FastAPI Backend
echo -e "${GREEN}Starting FastAPI Backend (port 3002)...${NC}"
cd "$AI_DOCTOR_DIR"

# Determine Python executable path (check youtube_summarizer for venv since dependencies are there)
PYTHON_CMD="python3"
if [ -d "$YOUTUBE_SUMMARIZER_DIR/.venv" ]; then
    PYTHON_CMD="$YOUTUBE_SUMMARIZER_DIR/.venv/bin/python3"
    echo -e "${GREEN}Using .venv virtual environment from youtube_summarizer${NC}"
elif [ -d "$YOUTUBE_SUMMARIZER_DIR/venv" ]; then
    PYTHON_CMD="$YOUTUBE_SUMMARIZER_DIR/venv/bin/python3"
    echo -e "${GREEN}Using venv virtual environment from youtube_summarizer${NC}"
else
    echo -e "${YELLOW}Warning: No virtual environment found. Using system Python.${NC}"
fi

# Start API with full path to Python
cd "$AI_DOCTOR_DIR"
"$PYTHON_CMD" api.py > "$SCRIPT_DIR/api.log" 2>&1 &
API_PID=$!

# Wait for API to start (Ask initialization can take time)
echo -e "${YELLOW}Waiting for API to initialize (this may take a few seconds)...${NC}"
for i in {1..10}; do
    sleep 1
    if curl -s http://localhost:3002/health > /dev/null 2>&1; then
        break
    fi
    if ! kill -0 $API_PID 2>/dev/null; then
        echo -e "${RED}Error: FastAPI server process died${NC}"
        echo -e "${RED}Check api.log for details${NC}"
        cat "$SCRIPT_DIR/api.log" 2>/dev/null | tail -20
        kill $FRONTEND_PID 2>/dev/null
        exit 1
    fi
done

# Check if API started successfully
if ! kill -0 $API_PID 2>/dev/null; then
    echo -e "${RED}Error: FastAPI server failed to start${NC}"
    echo -e "${RED}Check api.log for details${NC}"
    cat "$SCRIPT_DIR/api.log" 2>/dev/null | tail -20
    kill $FRONTEND_PID 2>/dev/null
    exit 1
fi

# Verify API is responding
if ! curl -s http://localhost:3002/health > /dev/null 2>&1; then
    echo -e "${RED}Error: FastAPI server is not responding after 10 seconds${NC}"
    echo -e "${RED}Check api.log for details${NC}"
    cat "$SCRIPT_DIR/api.log" 2>/dev/null | tail -20
    kill $FRONTEND_PID $API_PID 2>/dev/null
    exit 1
fi

echo -e "${GREEN}FastAPI backend started (PID: $API_PID)${NC}"

echo -e "\n${GREEN}✓ Both services are running!${NC}"
echo -e "${GREEN}Frontend: http://localhost:3001${NC}"
echo -e "${GREEN}FastAPI:  http://localhost:3002${NC}"
echo -e "\n${YELLOW}Logs are available in:${NC}"
echo -e "${YELLOW}  - frontend.log${NC}"
echo -e "${YELLOW}  - api.log${NC}"
echo -e "\n${YELLOW}Press Ctrl+C to stop all services${NC}"

# Wait for processes
wait

