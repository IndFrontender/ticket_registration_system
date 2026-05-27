from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..services.backup_service import (
    backup_database, auto_backup, list_backups, verify_integrity,
    cleanup_old_backups, get_modules, create_full_backup,
    create_incremental_backup, restore_backup, BACKUP_DIR,
)
from ..database import get_db
import os

router = APIRouter(prefix="/api/system", tags=["system"])

DB_PATH = os.getenv("DATABASE_URL", "sqlite:///./ticket_system.db").replace("sqlite:///", "")

# Import auth deps lazily to avoid circular import
def _admin():
    from .auth import require_admin
    return require_admin

def _user():
    from .auth import get_current_user
    return get_current_user


class IncrementalBackupRequest(BaseModel):
    modules: list[str]


class BackupInfo(BaseModel):
    filename: str
    size: int
    type: str
    created_at: str


@router.get("/backup/modules")
def backup_modules():
    return {"modules": get_modules()}


@router.post("/backup")
def create_backup(admin=Depends(_admin())):
    path = auto_backup(DB_PATH)
    if not path or path.startswith("error"):
        raise HTTPException(500, f"Ошибка бэкапа: {path}")
    return {"message": "Бэкап создан", "path": path, "type": "db_copy"}


@router.post("/backup/full")
def create_full(admin=Depends(_admin())):
    path = create_full_backup(DB_PATH)
    if not path or path.startswith("error"):
        raise HTTPException(500, f"Ошибка полного бэкапа: {path}")
    return {"message": "Полный бэкап создан", "path": path, "type": "full"}


@router.post("/backup/incremental")
def create_incremental(req: IncrementalBackupRequest, admin=Depends(_admin()), db: Session = Depends(get_db)):
    if not req.modules:
        raise HTTPException(400, "Выберите хотя бы один модуль")
    path = create_incremental_backup(req.modules, db)
    return {"message": "Инкрементальный бэкап создан", "path": path, "type": "incremental", "modules": req.modules}


@router.post("/backup/restore/{filename}")
def restore(filename: str, admin=Depends(_admin())):
    result = restore_backup(filename, DB_PATH)
    if result.startswith("error"):
        raise HTTPException(500, result)
    return {"message": "Бэкап восстановлен", "file": filename}


@router.get("/backups")
def get_backups(user=Depends(_user())):
    return {"backups": list_backups()}


@router.get("/backup/download/{filename}")
def download_backup(filename: str, user=Depends(_user())):
    fpath = os.path.join(BACKUP_DIR, filename)
    if not os.path.exists(fpath):
        raise HTTPException(404, "Бэкап не найден")
    return FileResponse(fpath, filename=filename, media_type="application/octet-stream")


@router.get("/integrity")
def check_integrity(user=Depends(_user())):
    return verify_integrity(DB_PATH)


@router.get("/info")
def system_info(user=Depends(_user())):
    import platform, time
    from ..services.metrics_service import PROCESS_START
    db_size = os.path.getsize(DB_PATH) if os.path.exists(DB_PATH) else 0
    return {
        "version": "1.0.0",
        "platform": platform.system(),
        "python": platform.python_version(),
        "uptime_seconds": int(time.time() - PROCESS_START),
        "db_path": DB_PATH,
        "db_size_bytes": db_size,
        "db_exists": os.path.exists(DB_PATH),
    }
