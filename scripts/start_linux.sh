#!/usr/bin/env bash
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'

echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}  Система учета регистрации заявок${NC}"
echo -e "${CYAN}  Linux Launcher${NC}"
echo -e "${CYAN}============================================${NC}"

if ! command -v python3 &> /dev/null; then
    echo -e "${RED}[ERROR] Python3 not found. Install: sudo apt install python3 python3-pip python3-venv${NC}"
    exit 1
fi
echo -e "${GREEN}[OK] Python3: $(python3 --version)${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR] Node.js not found. Install: sudo apt install nodejs npm${NC}"
    exit 1
fi
echo -e "${GREEN}[OK] Node.js: $(node --version)${NC}"

echo -e "${CYAN}[..] Installing Python dependencies...${NC}"
cd "$PROJECT_DIR/backend"
pip3 install -r requirements.txt --quiet
echo -e "${GREEN}[OK]${NC}"

if [ ! -d "$PROJECT_DIR/frontend/node_modules" ]; then
    echo -e "${CYAN}[..] Installing frontend dependencies...${NC}"
    cd "$PROJECT_DIR/frontend"
    npm install --silent
fi

if [ ! -f "$PROJECT_DIR/frontend/dist/index.html" ]; then
    echo -e "${CYAN}[..] Building frontend...${NC}"
    cd "$PROJECT_DIR/frontend"
    npm run build
    echo -e "${GREEN}[OK] Frontend built${NC}"
fi

echo ""
echo -e "${GREEN}Starting on http://localhost:8000${NC}"
echo -e "${GREEN}Press Ctrl+C to stop${NC}"
echo ""

cd "$PROJECT_DIR"
python3 standalone.py
