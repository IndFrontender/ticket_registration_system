#!/usr/bin/env bash
# ============================================
#   Система регистрации заявок
#   Запуск через Docker на Linux/macOS
# ============================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}  Система регистрации заявок${NC}"
echo -e "${CYAN}  Запуск через Docker${NC}"
echo -e "${CYAN}============================================${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}[ОШИБКА] Docker не найден. Установите Docker:${NC}"
    echo "  Linux: curl -fsSL https://get.docker.com | sh"
    echo "  macOS: https://docker.com/products/docker-desktop"
    exit 1
fi
echo -e "${GREEN}[OK] Docker найден: $(docker --version)${NC}"

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}[ОШИБКА] docker-compose не найден${NC}"
    exit 1
fi
echo -e "${GREEN}[OK] docker-compose найден${NC}"

cd "$PROJECT_DIR"

# Создание .env если отсутствует
if [ ! -f .env ]; then
    echo -e "${CYAN}[..] Создание .env файла...${NC}"
    cat > .env << 'EOF'
# Настройки интеграций (опционально)
OPENAI_API_KEY=
SMTP_HOST=
SMTP_USER=
SMTP_PASSWORD=
TELEGRAM_BOT_TOKEN=
EOF
    echo -e "${GREEN}[OK] .env создан. Отредактируйте для интеграций.${NC}"
fi

echo -e "${CYAN}[..] Сборка и запуск контейнеров...${NC}"
docker-compose up -d --build

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Система запущена через Docker!${NC}"
echo -e "${GREEN}  Веб-интерфейс: http://localhost${NC}"
echo -e "${GREEN}  API Swagger:  http://localhost:8000/docs${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "Команды:"
echo "  docker-compose logs -f    # Просмотр логов"
echo "  docker-compose down       # Остановка"
echo "  docker-compose restart    # Перезапуск"
echo ""
