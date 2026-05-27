#!/usr/bin/env bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[0;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BUILD_DIR="$PROJECT_DIR/dist/macos-app"
FRONTEND_DIR="$PROJECT_DIR/frontend"
BACKEND_DIR="$PROJECT_DIR/backend"
APP_NAME="TicketSystem"
APP_BUNDLE="$BUILD_DIR/$APP_NAME.app"
VERSION="1.0.0"

echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}  Building Система учета регистрации заявок${NC}"
echo -e "${CYAN}  macOS Application Bundle${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""

# ---- Check prerequisites ----
echo -e "${CYAN}[1/8] Checking prerequisites...${NC}"
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}[ERROR] Python3 not found. Install: brew install python@3.11${NC}"
    exit 1
fi
echo -e "${GREEN}  [OK] Python3: $(python3 --version)${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR] Node.js not found. Install: brew install node${NC}"
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
echo -e "${CYAN}[2/8] Installing Python dependencies...${NC}"
cd "$BACKEND_DIR"
pip3 install -r requirements.txt --quiet
echo -e "${GREEN}  [OK]${NC}"

# ---- Build frontend ----
echo ""
echo -e "${CYAN}[3/8] Building frontend...${NC}"
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
echo -e "${CYAN}[4/8] Copying frontend dist to backend...${NC}"
rm -rf "$BACKEND_DIR/frontend_dist"
cp -r "$FRONTEND_DIR/dist" "$BACKEND_DIR/frontend_dist"
echo -e "${GREEN}  [OK] frontend_dist ready${NC}"

# ---- Generate app icon (simple PNG from Python) ----
echo ""
echo -e "${CYAN}[5/8] Generating app icon...${NC}"
cd "$SCRIPT_DIR"
if [ -f "generate_icon.py" ]; then
    python3 generate_icon.py 2>/dev/null || true
fi
# Create a minimal PNG icon placeholder if needed
if [ ! -f "$FRONTEND_DIR/public/favicon.png" ]; then
    python3 -c "
import struct, zlib
def create_png(path, size=64):
    sig = b'\\x89PNG\\r\\n\\x1a\\n'
    ihdr_data = struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)
    ihdr_crc = zlib.crc32(b'IHDR' + ihdr_data) & 0xffffffff
    ihdr = struct.pack('>I', 13) + b'IHDR' + ihdr_data + struct.pack('>I', ihdr_crc)
    raw = b''
    for y in range(size):
        raw += b'\\x00'
        for x in range(size):
            cx, cy = size//2, size//2
            d = ((x-cx)**2 + (y-cy)**2) ** 0.5
            if d < size*0.4: raw += b'\\x16\\x77\\xff'
            elif d < size*0.45: raw += b'\\xff\\xff\\xff'
            else: raw += b'\\x2d\\x2d\\x30'
    idat_data = zlib.compress(raw)
    idat_crc = zlib.crc32(b'IDAT' + idat_data) & 0xffffffff
    idat = struct.pack('>I', len(idat_data)) + b'IDAT' + idat_data + struct.pack('>I', idat_crc)
    iend_crc = zlib.crc32(b'IEND') & 0xffffffff
    iend = struct.pack('>I', 0) + b'IEND' + struct.pack('>I', iend_crc)
    with open(path, 'wb') as f: f.write(sig + ihdr + idat + iend)
create_png('$BUILD_DIR/icon.png', 128)
" 2>/dev/null || true
fi
echo -e "${GREEN}  [OK] Icon ready${NC}"

# ---- PyInstaller (.app bundle) ----
echo ""
echo -e "${CYAN}[6/8] Building macOS .app bundle with PyInstaller...${NC}"
cd "$BACKEND_DIR"

python3 -m PyInstaller \
    --onefile \
    --windowed \
    --name "$APP_NAME" \
    --icon "$BUILD_DIR/icon.png" \
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
echo -e "${GREEN}  [OK] .app bundle built${NC}"

rm -rf "$BACKEND_DIR/frontend_dist"

# ---- Create .app bundle structure manually ----
echo ""
echo -e "${CYAN}[7/8] Creating .app bundle structure...${NC}"
mkdir -p "$APP_BUNDLE/Contents/MacOS"
mkdir -p "$APP_BUNDLE/Contents/Resources"

if [ -f "$BACKEND_DIR/dist/$APP_NAME" ]; then
    cp "$BACKEND_DIR/dist/$APP_NAME" "$APP_BUNDLE/Contents/MacOS/$APP_NAME"
    chmod +x "$APP_BUNDLE/Contents/MacOS/$APP_NAME"
elif [ -f "$BACKEND_DIR/dist/$APP_NAME.bin" ]; then
    cp "$BACKEND_DIR/dist/$APP_NAME.bin" "$APP_BUNDLE/Contents/MacOS/$APP_NAME"
    chmod +x "$APP_BUNDLE/Contents/MacOS/$APP_NAME"
fi

cp "$BUILD_DIR/icon.png" "$APP_BUNDLE/Contents/Resources/icon.png" 2>/dev/null || true

# Create Info.plist
cat > "$APP_BUNDLE/Contents/Info.plist" << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple Computer//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>Russian</string>
    <key>CFBundleDisplayName</key>
    <string>Система учета регистрации заявок</string>
    <key>CFBundleExecutable</key>
    <string>$APP_NAME</string>
    <key>CFBundleIconFile</key>
    <string>icon</string>
    <key>CFBundleIdentifier</key>
    <string>com.ticketsystem.app</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>TicketSystem</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>$VERSION</string>
    <key>CFBundleVersion</key>
    <string>$VERSION</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.15</string>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>
PLIST
echo -e "${GREEN}  [OK] .app bundle ready at $APP_BUNDLE${NC}"

# Cleanup build artifacts
rm -rf "$BACKEND_DIR/build" "$BACKEND_DIR/dist" "$BACKEND_DIR/__pycache__"
rm -f "$BACKEND_DIR/$APP_NAME.spec"

# ---- Create DMG ----
echo ""
echo -e "${CYAN}[8/8] Creating DMG image...${NC}"
DMG_NAME="TicketSystem-macOS-$VERSION"
DMG_PATH="$PROJECT_DIR/dist/$DMG_NAME.dmg"

if command -v hdiutil &> /dev/null; then
    # Create a temporary DMG and then convert to compressed
    TMP_DMG="$BUILD_DIR/tmp.dmg"
    VOLUME_DIR="$BUILD_DIR/volume"
    mkdir -p "$VOLUME_DIR"
    cp -R "$APP_BUNDLE" "$VOLUME_DIR/"
    cp "$PROJECT_DIR/README.md" "$VOLUME_DIR/" 2>/dev/null || true
    ln -s /Applications "$VOLUME_DIR/Applications" 2>/dev/null || true

    hdiutil create "$TMP_DMG" -ov -volname "TicketSystem $VERSION" -fs HFS+ \
        -srcfolder "$VOLUME_DIR" -format UDRW -size 500m -quiet 2>/dev/null || {
        echo -e "${YELLOW}  [WARN] DMG creation failed, skipping${NC}"
        rm -rf "$TMP_DMG" "$VOLUME_DIR" 2>/dev/null
        echo -e "${GREEN}  [OK] App bundle available at: $APP_BUNDLE${NC}"
        exit 0
    }

    # Convert to compressed DMG
    hdiutil convert "$TMP_DMG" -format UDZO -o "$DMG_PATH" -quiet 2>/dev/null
    rm -rf "$TMP_DMG" "$VOLUME_DIR" 2>/dev/null

    if [ -f "$DMG_PATH" ]; then
        echo -e "${GREEN}  [OK] DMG: $DMG_PATH${NC}"
    else
        echo -e "${YELLOW}  [WARN] DMG compression failed, skipping${NC}"
    fi
else
    echo -e "${YELLOW}  [WARN] hdiutil not found, skipping DMG creation${NC}"
fi

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  BUILD COMPLETE!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "  .app: $APP_BUNDLE"
if [ -f "$DMG_PATH" ]; then
    echo -e "  DMG:  $DMG_PATH"
fi
echo ""
echo -e "  To run: open $APP_BUNDLE"
echo ""
