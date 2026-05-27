#!/bin/bash
# Скрипт деплоя веб-версии на хостинг
# Использование: bash scripts/deploy.sh

set -e

echo "=== Сборка Системы учета регистрации заявок для хостинга ==="

# 1. Сборка фронтенда
echo "[1/3] Сборка фронтенда..."
cd frontend
npm install --silent
npm run build
cd ..

# 2. Копирование фронтенда в backend
echo "[2/3] Копирование статики..."
rm -rf backend/frontend_dist
cp -r frontend/dist backend/frontend_dist

# 3. Финальная проверка
echo "[3/3] Проверка..."
if [ -f "backend/frontend_dist/index.html" ]; then
    echo "  [OK] Статика готова"
else
    echo "  [ERROR] Статика не найдена"
    exit 1
fi

if [ -f "web_run.py" ]; then
    echo "  [OK] Точка входа веб-сервера"
fi

echo ""
echo "=== Сборка завершена ==="
echo ""
echo "Для деплоя на хостинг:"
echo "  1. Загрузите на сервер папки/файлы:"
echo "     - backend/"
echo "     - web_run.py"
echo "     - .env (на основе .env.example)"
echo ""
echo "  2. Установите зависимости:"
echo "     pip install -r backend/requirements.txt"
echo "     pip install gunicorn"
echo ""
echo "  3. Запустите:"
echo "     gunicorn web_run:app -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000"
echo ""
echo "  Или через Docker:"
echo "     docker build -t ticket-system ."
echo "     docker run -p 8000:8000 ticket-system"
