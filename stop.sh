#!/bin/bash

# Jam-Find Stop Script
# Stops backend, frontend, and Firebase emulator processes

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# PID file locations
BACKEND_PID_FILE="$SCRIPT_DIR/.backend.pid"
FRONTEND_PID_FILE="$SCRIPT_DIR/.frontend.pid"
EMULATOR_PID_FILE="$SCRIPT_DIR/.emulator.pid"

echo -e "${YELLOW}Stopping Jam-Find servers...${NC}\n"

# Stop Firebase emulators
if [ -f "$EMULATOR_PID_FILE" ]; then
    EMULATOR_PID=$(cat "$EMULATOR_PID_FILE")
    if kill -0 "$EMULATOR_PID" 2>/dev/null; then
        echo -e "${BLUE}Stopping Firebase emulators (PID: $EMULATOR_PID)...${NC}"
        kill "$EMULATOR_PID"
        echo -e "${GREEN}✓ Emulators stopped${NC}"
    else
        echo -e "${YELLOW}Emulator process not running${NC}"
    fi
    rm "$EMULATOR_PID_FILE"
else
    echo -e "${YELLOW}No emulator PID file found${NC}"
fi
# Kill any orphaned java emulator processes regardless
pkill -f 'cloud-firestore-emulator' 2>/dev/null && echo -e "${GREEN}✓ Killed orphaned Firestore emulator${NC}"
pkill -f 'cloud-storage-rules' 2>/dev/null && echo -e "${GREEN}✓ Killed orphaned Storage rules process${NC}"

# Stop backend
if [ -f "$BACKEND_PID_FILE" ]; then
    BACKEND_PID=$(cat "$BACKEND_PID_FILE")
    if kill -0 "$BACKEND_PID" 2>/dev/null; then
        echo -e "${BLUE}Stopping backend (PID: $BACKEND_PID)...${NC}"
        kill "$BACKEND_PID"
        echo -e "${GREEN}✓ Backend stopped${NC}"
    else
        echo -e "${YELLOW}Backend not running${NC}"
    fi
    rm "$BACKEND_PID_FILE"
else
    echo -e "${YELLOW}No backend PID file found${NC}"
fi

# Stop frontend
if [ -f "$FRONTEND_PID_FILE" ]; then
    FRONTEND_PID=$(cat "$FRONTEND_PID_FILE")
    if kill -0 "$FRONTEND_PID" 2>/dev/null; then
        echo -e "${BLUE}Stopping frontend (PID: $FRONTEND_PID)...${NC}"
        kill "$FRONTEND_PID"
        echo -e "${GREEN}✓ Frontend stopped${NC}"
    else
        echo -e "${YELLOW}Frontend not running${NC}"
    fi
    rm "$FRONTEND_PID_FILE"
else
    echo -e "${YELLOW}No frontend PID file found${NC}"
fi

# Free key ports (belt-and-suspenders)
for PORT in 8000 5173 4000 8080 9099 9199 9150; do
    PIDS=$(lsof -ti:$PORT 2>/dev/null)
    if [ -n "$PIDS" ]; then
        echo -e "${BLUE}Freeing port $PORT...${NC}"
        echo "$PIDS" | xargs kill 2>/dev/null
    fi
done

echo -e "\n${GREEN}Done!${NC}"
