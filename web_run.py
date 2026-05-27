#!/usr/bin/env python3
"""
Система учета регистрации заявок — Веб-сервер для хостинга.
===========================================================
Запуск разработка:  python web_run.py
Запуск продакшен:  gunicorn web_run:app -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT
                   uvicorn web_run:app --host 0.0.0.0 --port $PORT

Переменные окружения:
  DATABASE_URL  — SQLite по умолчанию, для прода PostgreSQL:
                  postgresql://user:pass@host:5432/dbname
  SECRET_KEY    — ключ для JWT (обязательно сменить в продакшене)
  HOST / PORT   — хост и порт сервера
  OPENAI_API_KEY — ключ OpenAI для AI-ассистента
  AI_MODEL      — модель OpenAI (по умолчанию gpt-4)

Сборка перед деплоем:
  cd frontend && npm install && npm run build
  xcopy /e /i frontend\dist backend\frontend_dist   (Windows)
  cp -r frontend/dist backend/frontend_dist          (Linux/macOS)
"""
import os
import sys
import mimetypes
from pathlib import Path

mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('application/javascript', '.mjs')
mimetypes.add_type('text/css', '.css')
mimetypes.add_type('image/svg+xml', '.svg')

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from app.database import engine, Base, SessionLocal
from app.models import UserModel
import bcrypt as _bcrypt

# Trust proxy headers from nginx/reverse proxy
os.environ.setdefault("FORWARDED_ALLOW_IPS", "*")

Base.metadata.create_all(bind=engine)

_db = SessionLocal()
if _db.query(UserModel).count() == 0:
    admin = UserModel(
        username="Administrator",
        password_hash=_bcrypt.hashpw(b"dgduhrt", _bcrypt.gensalt()).decode(),
        role="admin",
        full_name="Главный администратор",
        is_active=True,
    )
    _db.add(admin)
    _db.commit()
    print("[i] Создан администратор: Administrator / dgduhrt")
_db.close()

from app.main import app as application

app = application


if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    print(f"[i] Веб-сервер запущен: http://{host}:{port}")
    uvicorn.run("web_run:app", host=host, port=port, reload=False, log_level="info")
