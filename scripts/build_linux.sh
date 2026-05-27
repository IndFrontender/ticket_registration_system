#!/usr/bin/env bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[0;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BUILD_DIR="$PROJECT_DIR/dist/linux-app"
FRONTEND_DIR="$PROJECT_DIR/frontend"
BACKEND_DIR="$PROJECT_DIR/backend"

echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}  Building Система учета регистрации заявок${NC}"
echo -e "${CYAN}  Linux Application Package${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""

# ---- Check prerequisites ----
echo -e "${CYAN}[1/7] Checking prerequisites...${NC}"
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}[ERROR] Python3 not found. Install: sudo apt install python3 python3-pip python3-venv${NC}"
    exit 1
fi
echo -e "${GREEN}  [OK] Python3: $(python3 --version)${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR] Node.js not found. Install: sudo apt install nodejs npm${NC}"
    exit 1
fi
echo -e "${GREEN}  [OK] Node.js: $(node --version)${NC}"

pip3 show pyinstaller &>/dev/null || {
    echo -e "${YELLOW}  [..] Installing PyInstaller...${NC}"
    pip3 install pyinstaller --quiet
}
echo -e "${GREEN}  [OK] PyInstaller ready${NC}"

# ---- Install Python deps ----
echo ""
echo -e "${CYAN}[2/7] Installing Python dependencies...${NC}"
cd "$BACKEND_DIR"
pip3 install -r requirements.txt --quiet
echo -e "${GREEN}  [OK]${NC}"

# ---- Build frontend ----
echo ""
echo -e "${CYAN}[3/7] Building frontend...${NC}"
cd "$FRONTEND_DIR"
if [ ! -d "node_modules" ]; then
    npm install --silent
fi
npm run build
if [ ! -f "dist/index.html" ]; then
    echo -e "${RED}[ERROR] Frontend build failed${NC}"
    exit 1
fi
echo -e "${GREEN}  [OK] Frontend built${NC}"

# ---- Copy frontend to backend ----
echo ""
echo -e "${CYAN}[4/7] Copying frontend dist to backend...${NC}"
rm -rf "$BACKEND_DIR/frontend_dist"
cp -r "$FRONTEND_DIR/dist" "$BACKEND_DIR/frontend_dist"
echo -e "${GREEN}  [OK] frontend_dist ready${NC}"

# ---- PyInstaller ----
echo ""
echo -e "${CYAN}[5/7] Building executable with PyInstaller...${NC}"
cd "$BACKEND_DIR"

python3 -m PyInstaller \
    --onefile \
    --name "TicketSystem" \
    --add-data "app:app" \
    --add-data "frontend_dist:frontend_dist" \
    --hidden-import uvicorn \
    --hidden-import uvicorn.logging \
    --hidden-import uvicorn.loops.auto \
    --hidden-import uvicorn.protocols.http.auto \
    --hidden-import uvicorn.protocols.websockets.auto \
    --hidden-import jinja2 \
    --hidden-import sqlalchemy \
    --hidden-import pydantic \
    --hidden-import python_multipart \
    --hidden-import httpx \
    --hidden-import openpyxl \
    --hidden-import prometheus_client \
    --hidden-import psutil \
    --hidden-import aiofiles \
    --hidden-import weasyprint \
    --hidden-import pymongo \
    --hidden-import openai \
    --hidden-import passlib \
    --hidden-import python_jose \
    --collect-submodules app \
    --collect-data app \
    --noconfirm \
    "app/windows_app.py"

if [ $? -ne 0 ]; then
    echo -e "${RED}[ERROR] PyInstaller build failed${NC}"
    rm -rf "$BACKEND_DIR/frontend_dist"
    exit 1
fi
echo -e "${GREEN}  [OK] Executable built${NC}"

rm -rf "$BACKEND_DIR/frontend_dist"

# ---- Gather release files ----
echo ""
echo -e "${CYAN}[6/7] Gathering release files...${NC}"
mkdir -p "$BUILD_DIR"

if [ -f "$BACKEND_DIR/dist/TicketSystem" ]; then
    cp "$BACKEND_DIR/dist/TicketSystem" "$BUILD_DIR/"
    echo -e "${GREEN}  [OK] TicketSystem binary${NC}"
elif [ -f "$BACKEND_DIR/dist/TicketSystem.bin" ]; then
    cp "$BACKEND_DIR/dist/TicketSystem.bin" "$BUILD_DIR/TicketSystem"
    echo -e "${GREEN}  [OK] TicketSystem binary${NC}"
fi

# Cleanup build artifacts
rm -rf "$BACKEND_DIR/build" "$BACKEND_DIR/dist" "$BACKEND_DIR/__pycache__"
rm -f "$BACKEND_DIR/TicketSystem.spec"

# Copy README
cp "$PROJECT_DIR/README.md" "$BUILD_DIR/" 2>/dev/null || true

# ---- Create launcher script ----
cat > "$BUILD_DIR/start.sh" << 'LAUNCHER'
#!/usr/bin/env bash
DIR="$(cd "$(dirname "$0")" && pwd)"
chmod +x "$DIR/TicketSystem" 2>/dev/null
exec "$DIR/TicketSystem" "$@"
LAUNCHER
chmod +x "$BUILD_DIR/start.sh"
echo -e "${GREEN}  [OK] start.sh launcher${NC}"

# ---- Desktop entry ----
cat > "$BUILD_DIR/ticket-system.desktop" << DESKTOP
[Desktop Entry]
Name=Система учета регистрации заявок
Comment=System for managing tickets, equipment, and warranty
Exec=$BUILD_DIR/start.sh
Icon=$BUILD_DIR/icon.png
Terminal=false
Type=Application
Categories=Utility;Office;
DESKTOP
echo -e "${GREEN}  [OK] Desktop entry${NC}"

# ---- Create tar.gz ----
echo ""
echo -e "${CYAN}[7/7] Creating tar.gz archive...${NC}"
cd "$PROJECT_DIR/dist"
PKG_NAME="TicketSystem-Linux-$(uname -m)"
tar -czf "$PKG_NAME.tar.gz" -C "$PROJECT_DIR/dist" "linux-app"
echo -e "${GREEN}  [OK] Archive: dist/$PKG_NAME.tar.gz${NC}"

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  BUILD COMPLETE!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "  Binary:  $BUILD_DIR/TicketSystem"
echo -e "  Archive: dist/$PKG_NAME.tar.gz"
echo ""
echo -e "  To run:  $BUILD_DIR/start.sh"
echo ""
