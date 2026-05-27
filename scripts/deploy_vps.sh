#!/bin/bash
set -euo pipefail

# ====================================================
#  Деплой Системы учета регистрации заявок на VPS/VDS
#  Ubuntu 22.04 / Debian 12
# ====================================================
#  Запуск от root или пользователя с sudo:
#    bash scripts/deploy_vps.sh
#
#  Что делает:
#    1. Устанавливает PostgreSQL, nginx, certbot, Node.js, Python
#    2. Создаёт пользователя ticketadmin
#    3. Клонирует/копирует проект в /opt/ticket-system
#    4. Настраивает виртуальное окружение Python
#    5. Собирает фронтенд
#    6. Настраивает PostgreSQL (БД + пользователь)
#    7. Настраивает systemd + nginx
#    8. Получает SSL-сертификат Let's Encrypt
# ====================================================

# ---- Настройки (измените под себя) ----
DOMAIN="${DOMAIN:-ticket.example.com}"           # Ваш домен
ADMIN_PASSWORD="${ADMIN_PASSWORD:-dgduhrt}"       # Пароль администратора
SECRET_KEY="${SECRET_KEY:-$(openssl rand -hex 32)}"  # JWT-ключ
DB_PASSWORD="${DB_PASSWORD:-$(openssl rand -hex 16)}" # Пароль PostgreSQL
POSTGRES_VERSION="${POSTGRES_VERSION:-15}"
GIT_REPO="${GIT_REPO:-}"  # URL git-репозитория (оставьте пустым, если код уже на сервере)

# ---- Цвета ----
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()  { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ---- Проверка прав ----
if [ "$EUID" -ne 0 ]; then err "Запустите с sudo или от root"; fi

# ---- 1. Системные зависимости ----
log "Обновление пакетов..."
apt-get update -qq && apt-get upgrade -y -qq

log "Установка PostgreSQL, nginx, Python, Node.js, certbot..."
apt-get install -y -qq \
    postgresql postgresql-contrib \
    nginx \
    certbot python3-certbot-nginx \
    python3 python3-pip python3-venv \
    nodejs npm \
    git curl wget \
    libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf2.0-0 \
    libcairo2 libcairo-dev \
    redis-server \
    logrotate

# ---- 2. Пользователь ----
log "Создание пользователя ticketadmin..."
if ! id -u ticketadmin &>/dev/null; then
    useradd -m -s /bin/bash -d /opt/ticket-system ticketadmin
    usermod -aG www-data ticketadmin
else
    warn "Пользователь ticketadmin уже существует"
fi

# ---- 3. Проект ----
PROJECT_DIR="/opt/ticket-system"
if [ -n "$GIT_REPO" ]; then
    log "Клонирование репозитория..."
    if [ -d "$PROJECT_DIR/.git" ]; then
        git -C "$PROJECT_DIR" pull
    else
        git clone "$GIT_REPO" "$PROJECT_DIR"
    fi
else
    SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
    if [ "$SCRIPT_DIR" != "$PROJECT_DIR" ]; then
        warn "Копирование проекта из $SCRIPT_DIR в $PROJECT_DIR..."
        rsync -a --exclude={'node_modules','__pycache__','*.db','.env','venv','.git'} \
            "$SCRIPT_DIR/" "$PROJECT_DIR/"
    fi
fi

cd "$PROJECT_DIR"
mkdir -p backend/data /var/log/ticket-system
chown -R ticketadmin:ticketadmin "$PROJECT_DIR" /var/log/ticket-system

# ---- 4. Виртуальное окружение Python ----
log "Настройка виртуального окружения Python..."
if [ ! -d "$PROJECT_DIR/venv" ]; then
    python3 -m venv "$PROJECT_DIR/venv"
fi
chown -R ticketadmin:ticketadmin "$PROJECT_DIR/venv"

source "$PROJECT_DIR/venv/bin/activate"
pip install --upgrade pip -q
pip install gunicorn uvicorn[standard] -q
pip install -r "$PROJECT_DIR/backend/requirements.txt" -q
log "Python-зависимости установлены"

# ---- 5. Фронтенд ----
log "Сборка фронтенда..."
if [ -d "$PROJECT_DIR/frontend" ]; then
    cd "$PROJECT_DIR/frontend"
    npm install --silent
    npm run build
    rm -rf "$PROJECT_DIR/backend/frontend_dist"
    cp -r dist "$PROJECT_DIR/backend/frontend_dist"
    log "Фронтенд собран"
else
    warn "Папка frontend не найдена — статика не собрана"
fi

# ---- 6. PostgreSQL ----
log "Настройка PostgreSQL..."
if ! systemctl is-active --quiet postgresql; then
    systemctl start postgresql
    systemctl enable postgresql
fi

su - postgres -c "psql -c \"SELECT 1 FROM pg_roles WHERE rolname='ticketadmin'\" | grep -q 1" || {
    su - postgres -c "psql -c \"CREATE USER ticketadmin WITH PASSWORD '${DB_PASSWORD}';\""
    su - postgres -c "psql -c \"CREATE DATABASE ticket_system OWNER ticketadmin;\""
    su - postgres -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE ticket_system TO ticketadmin;\""
    log "Пользователь и БД PostgreSQL созданы"
}

DATABASE_URL="postgresql://ticketadmin:${DB_PASSWORD}@localhost:5432/ticket_system"

# ---- 7. .env ----
log "Создание .env..."
cat > "$PROJECT_DIR/.env" << EOF
DATABASE_URL=${DATABASE_URL}
SECRET_KEY=${SECRET_KEY}
HOST=127.0.0.1
PORT=8000
ADMIN_PASSWORD=${ADMIN_PASSWORD}
EOF
chown ticketadmin:ticketadmin "$PROJECT_DIR/.env"
chmod 600 "$PROJECT_DIR/.env"

# ---- 8. systemd ----
log "Настройка systemd..."
sed -e "s|DOMAIN_NAME|${DOMAIN}|g" \
    -e "s|DATABASE_URL|${DATABASE_URL}|g" \
    -e "s|SECRET_KEY|${SECRET_KEY}|g" \
    "$PROJECT_DIR/scripts/ticket-system.service" > /etc/systemd/system/ticket-system.service

systemctl daemon-reload
systemctl enable ticket-system
systemctl restart ticket-system
log "systemd-сервис запущен"

# ---- 9. nginx ----
log "Настройка nginx..."
sed "s/DOMAIN_NAME/${DOMAIN}/g" \
    "$PROJECT_DIR/scripts/ticket-system.nginx" > /etc/nginx/sites-available/ticket-system

if [ -f /etc/nginx/sites-enabled/default ]; then
    rm /etc/nginx/sites-enabled/default
fi
ln -sf /etc/nginx/sites-available/ticket-system /etc/nginx/sites-enabled/

# ---- 10. SSL (Let's Encrypt) ----
log "Получение SSL-сертификата..."
if [ "$DOMAIN" != "ticket.example.com" ]; then
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos \
        --email "admin@${DOMAIN}" --redirect || warn "SSL не получен — проверьте DNS"
fi

systemctl restart nginx
log "nginx настроен"

# ---- 11. Logrotate ----
log "Настройка logrotate..."
cat > /etc/logrotate.d/ticket-system << 'EOF'
/var/log/ticket-system/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
    dateext
}
EOF

# ---- 12. Проверка ----
log "Проверка сервиса..."
sleep 3
if systemctl is-active --quiet ticket-system; then
    log "Сервис работает"
else
    warn "Сервис не запустился — журнал: journalctl -u ticket-system -n 30 --no-pager"
fi

echo ""
echo "============================================"
echo "  Деплой завершён!"
echo "============================================"
echo ""
echo "  Сайт:     https://${DOMAIN}"
echo "  Логин:    Administrator"
echo "  Пароль:   ${ADMIN_PASSWORD}"
echo ""
echo "  PostgreSQL:"
echo "    user:     ticketadmin"
echo "    password: ${DB_PASSWORD}"
echo "    database: ticket_system"
echo "    url:      ${DATABASE_URL}"
echo ""
echo "  Команды:"
echo "    systemctl status ticket-system"
echo "    journalctl -u ticket-system -f"
echo "    systemctl restart ticket-system"
echo ""
echo "============================================"
