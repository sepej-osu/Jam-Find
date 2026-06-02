#!/bin/bash

# Jam-Find Start Script
# Starts both backend (in venv) and frontend development servers
# Conditionally starts Firebase emulators based on USE_EMULATOR in backend/.env

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

# PID file locations
BACKEND_PID_FILE="$SCRIPT_DIR/.backend.pid"
FRONTEND_PID_FILE="$SCRIPT_DIR/.frontend.pid"
EMULATOR_PID_FILE="$SCRIPT_DIR/.emulator.pid"

# Read USE_EMULATOR from backend/.env
USE_EMULATOR=false
if [ -f "$BACKEND_DIR/.env" ]; then
    USE_EMULATOR_VAL=$(grep -E '^USE_EMULATOR=' "$BACKEND_DIR/.env" | cut -d'=' -f2 | tr -d '[:space:]')
    if [[ "$USE_EMULATOR_VAL" == "True" || "$USE_EMULATOR_VAL" == "true" ]]; then
        USE_EMULATOR=true
    fi
fi

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down servers...${NC}"

    # Kill emulators
    if [ -f "$EMULATOR_PID_FILE" ]; then
        EMULATOR_PID=$(cat "$EMULATOR_PID_FILE")
        if kill -0 "$EMULATOR_PID" 2>/dev/null; then
            echo -e "${BLUE}Stopping Firebase emulators (PID: $EMULATOR_PID)...${NC}"
            kill "$EMULATOR_PID"
        fi
        rm "$EMULATOR_PID_FILE"
        # Kill any orphaned java emulator processes
        pkill -f 'cloud-firestore-emulator' 2>/dev/null
        pkill -f 'cloud-storage-rules' 2>/dev/null
    fi

    # Kill backend
    if [ -f "$BACKEND_PID_FILE" ]; then
        BACKEND_PID=$(cat "$BACKEND_PID_FILE")
        if kill -0 "$BACKEND_PID" 2>/dev/null; then
            echo -e "${BLUE}Stopping backend (PID: $BACKEND_PID)...${NC}"
            kill "$BACKEND_PID"
        fi
        rm "$BACKEND_PID_FILE"
    fi

    # Kill frontend
    if [ -f "$FRONTEND_PID_FILE" ]; then
        FRONTEND_PID=$(cat "$FRONTEND_PID_FILE")
        if kill -0 "$FRONTEND_PID" 2>/dev/null; then
            echo -e "${BLUE}Stopping frontend (PID: $FRONTEND_PID)...${NC}"
            kill "$FRONTEND_PID"
        fi
        rm "$FRONTEND_PID_FILE"
    fi

    echo -e "${GREEN}Servers stopped.${NC}"
    exit 0
}

# Trap SIGINT (Ctrl+C) and SIGTERM
trap cleanup SIGINT SIGTERM

echo -e "${GREEN}=== Jam-Find Development Server Startup ===${NC}\n"

# Check if backend venv exists
if [ ! -d "$BACKEND_DIR/venv" ]; then
    echo -e "${RED}Error: Backend virtual environment not found!${NC}"
    echo -e "${YELLOW}Please run: cd backend && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt${NC}"
    exit 1
fi

# Check if frontend node_modules exists
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo -e "${RED}Error: Frontend node_modules not found!${NC}"
    echo -e "${YELLOW}Please run: cd frontend && npm install${NC}"
    exit 1
fi

# Start Firebase emulators (only if USE_EMULATOR=True)
if [ "$USE_EMULATOR" = true ]; then
    echo -e "${BLUE}Starting Firebase emulators...${NC}"
    cd "$SCRIPT_DIR"
    firebase emulators:start --import=emulator_data > "$SCRIPT_DIR/emulator.log" 2>&1 &
    EMULATOR_PID=$!
    echo $EMULATOR_PID > "$EMULATOR_PID_FILE"
    echo -e "${GREEN}✓ Firebase emulators starting (PID: $EMULATOR_PID)${NC}"
    echo -e "  Logs: emulator.log"
    echo -e "  UI:   http://localhost:4000\n"
    # Give emulators time to be ready before starting backend
    echo -e "${YELLOW}Waiting for emulators to be ready...${NC}"
    for i in $(seq 1 30); do
        if curl -s http://localhost:4000 > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Emulators ready${NC}\n"
            break
        fi
        sleep 1
    done
else
    echo -e "${YELLOW}USE_EMULATOR=False — connecting to production Firebase${NC}\n"
    # Ensure frontend is also pointing at production
    sed -i 's/^VITE_USE_EMULATORS=true/VITE_USE_EMULATORS=false/' "$FRONTEND_DIR/.env" 2>/dev/null
fi

# Sync frontend VITE_USE_EMULATORS to match backend USE_EMULATOR
if [ "$USE_EMULATOR" = true ]; then
    sed -i 's/^VITE_USE_EMULATORS=false/VITE_USE_EMULATORS=true/' "$FRONTEND_DIR/.env" 2>/dev/null
else
    sed -i 's/^VITE_USE_EMULATORS=true/VITE_USE_EMULATORS=false/' "$FRONTEND_DIR/.env" 2>/dev/null
fi

# Start backend
echo -e "${BLUE}Starting backend server...${NC}"
cd "$BACKEND_DIR"
source venv/bin/activate
uvicorn main:app --reload > "$SCRIPT_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > "$BACKEND_PID_FILE"
echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"
echo -e "  Logs: backend.log"
echo -e "  API: http://localhost:8000"
echo -e "  Docs: http://localhost:8000/docs\n"

# Start frontend
echo -e "${BLUE}Starting frontend server...${NC}"
cd "$FRONTEND_DIR"
npm run dev > "$SCRIPT_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > "$FRONTEND_PID_FILE"
echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"
echo -e "  Logs: frontend.log"
echo -e "  URL: http://localhost:5173\n"

echo -e "${GREEN}=== All servers running ===${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop all servers${NC}\n"

# Keep the script alive until Ctrl+C
while true; do
    sleep 1
done
