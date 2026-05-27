#!/usr/bin/env python3
"""
Система учета регистрации заявок — Автономная локальная версия для одного сисадмина.
Всё в одном процессе. БД — SQLite. Без Docker, без MongoDB, без микросервисов.

Запуск:  python standalone.py
Адрес:   http://localhost:8000
"""
import os
import sys
import webbrowser
import threading
import time

# Добавляем backend в путь
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

# Принудительно SQLite
os.environ["DATABASE_URL"] = os.environ.get("DATABASE_URL", "sqlite:///./ticket_system.db")

# Авто-бэкап при старте
from app.services.backup_service import auto_backup
db_path = os.environ["DATABASE_URL"].replace("sqlite:///", "")
if os.path.exists(db_path):
    print("[i] Авто-бэкап перед запуском...")
    backup_path = auto_backup(db_path)
    if backup_path and not backup_path.startswith("error"):
        print(f"  [OK] Бэкап: {backup_path}")

# Авто-инициализация администратора при первом запуске
from app.database import SessionLocal, engine, Base
from app.models import UserModel
import bcrypt as _bcrypt

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

# Импорт и запуск FastAPI
print("[i] Загрузка приложения...")
from app.main import app
import uvicorn

PORT = int(os.environ.get("PORT", "8000"))

def open_browser():
    time.sleep(3)
    webbrowser.open(f"http://localhost:{PORT}")

if __name__ == "__main__":
    print("=" * 50)
    print("  Система учета регистрации заявок — Standalone")
    print(f"  Версия: 1.0.0")
    print(f"  БД: {db_path}")
    print(f"  Адрес: http://localhost:{PORT}")
    print("=" * 50)
    print()
    print("  Страницы:")
    print(f"    Дашборд:    http://localhost:{PORT}/")
    print(f"    Аналитика:  http://localhost:{PORT}/analytics")
    print(f"    Метрики:    http://localhost:{PORT}/metrics")
    print(f"    API Docs:   http://localhost:{PORT}/docs")
    print(f"    Бэкапы:     POST /api/system/backup")
    print()
    print("  Нажмите Ctrl+C для остановки")
    print()

    threading.Thread(target=open_browser, daemon=True).start()
    uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="info")
