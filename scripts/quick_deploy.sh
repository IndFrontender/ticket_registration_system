#!/bin/bash
set -euo pipefail
# Быстрый деплой, если код уже на сервере (через git pull / scp / rsync)

PROJECT_DIR="/opt/ticket-system"
cd "$PROJECT_DIR"

echo "[1/6] Виртуальное окружение..."
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip -q
pip install gunicorn uvicorn[standard] -q
pip install -r backend/requirements.txt -q

echo "[2/6] Сборка фронтенда..."
cd frontend
npm install --silent
npm run build
cd ..
rm -rf backend/frontend_dist
cp -r frontend/dist backend/frontend_dist

echo "[3/6] .env (если нет)..."
if [ ! -f .env ]; then
    cat > .env << EOF
DATABASE_URL=sqlite:///./backend/data/ticket_system.db
SECRET_KEY=$(openssl rand -hex 32)
HOST=127.0.0.1
PORT=8000
EOF
    echo "  .env создан"
fi

echo "[4/6] Директории..."
mkdir -p backend/data /var/log/ticket-system

echo "[5/6] systemd..."
sed "s|DOMAIN_NAME|${DOMAIN:-localhost}|g" \
    scripts/ticket-system.service > /etc/systemd/system/ticket-system.service
systemctl daemon-reload
systemctl enable --now ticket-system

echo "[6/6] Статус..."
sleep 2
systemctl status ticket-system --no-pager | head -15
echo ""
echo "Готово! https://${DOMAIN:-localhost}:8000"
