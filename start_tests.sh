#!/bin/bash

# Jam-Find Test Runner
# Activates backend venv and runs all pytest tests in backend/tests/

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"

echo -e "${GREEN}=== Jam-Find Backend Test Runner ===${NC}\n"

# Check if backend venv exists
if [ ! -d "$BACKEND_DIR/venv" ]; then
    echo -e "${RED}Error: Backend virtual environment not found!${NC}"
    echo -e "${YELLOW}Please run: cd backend && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt${NC}"
    exit 1
fi

# Activate venv and run tests
echo -e "${BLUE}Activating virtual environment...${NC}"
cd "$BACKEND_DIR"
source venv/bin/activate

echo -e "${BLUE}Running tests in backend/tests/...${NC}\n"
pytest tests/ "$@"
EXIT_CODE=$?

deactivate

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "\n${GREEN}All tests passed.${NC}"
else
    echo -e "\n${RED}Some tests failed (exit code: $EXIT_CODE).${NC}"
fi

exit $EXIT_CODE
