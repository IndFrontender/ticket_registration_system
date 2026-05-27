import os
import shutil
import json
import zipfile
import time
from datetime import datetime
from pathlib import Path
from io import StringIO

import sqlalchemy
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

BACKUP_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "backups")
MAX_BACKUPS = 30
UPLOADS_DIR = os.path.join(os.path.dirname(BACKUP_DIR), "uploads")

INCREMENTAL_MODULES = {
    "tickets": ["tickets", "ticket_history", "attachments"],
    "clients": ["clients"],
    "equipment": ["equipment", "equipment_maintenance", "equipment_reminders"],
    "tasks": ["tasks"],
    "inspections": ["inspection_reports", "warranty_checklist"],
    "documents": ["documents", "document_items"],
    "settings": ["report_templates"],
    "users": ["users"],
}


def ensure_backup_dir():
    os.makedirs(BACKUP_DIR, exist_ok=True)


def backup_database(db_path: str) -> str:
    ensure_backup_dir()
    if not os.path.exists(db_path):
        return None
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"ticket_system_backup_{ts}.db"
    dest = os.path.join(BACKUP_DIR, filename)
    try:
        shutil.copy2(db_path, dest)
        return dest
    except Exception as e:
        return f"error: {e}"


def create_full_backup(db_path: str) -> str:
    ensure_backup_dir()
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    zip_name = f"full_backup_{ts}.zip"
    zip_path = os.path.join(BACKUP_DIR, zip_name)
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        if os.path.exists(db_path):
            zf.write(db_path, "ticket_system.db")
        if os.path.exists(UPLOADS_DIR):
            for root, dirs, files in os.walk(UPLOADS_DIR):
                for f in files:
                    fp = os.path.join(root, f)
                    arcname = os.path.relpath(fp, os.path.dirname(UPLOADS_DIR))
                    zf.write(fp, arcname)
    return zip_path


def create_incremental_backup(modules: list[str], db: Session) -> str:
    ensure_backup_dir()
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    zip_name = f"inc_backup_{ts}.zip"
    zip_path = os.path.join(BACKUP_DIR, zip_name)

    tables_to_export = set()
    for mod in modules:
        for table in INCREMENTAL_MODULES.get(mod, []):
            tables_to_export.add(table)

    data = {}
    engine = db.get_bind()
    inspector = inspect(engine)
    available = inspector.get_table_names()

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for table in tables_to_export:
            if table not in available:
                continue
            rows = db.execute(text(f"SELECT * FROM {table}")).mappings().all()
            table_data = [dict(row) for row in rows]
            for row in table_data:
                for k, v in row.items():
                    if isinstance(v, datetime):
                        row[k] = v.isoformat()
            content = json.dumps(table_data, ensure_ascii=False, default=str)
            zf.writestr(f"{table}.json", content)
            data[table] = len(table_data)

        meta = {
            "type": "incremental",
            "created_at": ts,
            "modules": modules,
            "tables": dict(data),
        }
        zf.writestr("_meta.json", json.dumps(meta, ensure_ascii=False))

    return zip_path


def restore_backup(filename: str, db_path: str) -> str:
    ensure_backup_dir()
    fpath = os.path.join(BACKUP_DIR, filename)
    if not os.path.exists(fpath):
        return "error: файл бэкапа не найден"

    if filename.endswith(".db"):
        try:
            shutil.copy2(fpath, db_path)
            return "ok"
        except Exception as e:
            return f"error: {e}"

    if filename.endswith(".zip"):
        with zipfile.ZipFile(fpath, "r") as zf:
            names = zf.namelist()
            if "ticket_system.db" in names:
                tmp = fpath + ".tmp.db"
                zf.extract("ticket_system.db", os.path.dirname(tmp))
                extracted = os.path.join(os.path.dirname(tmp), "ticket_system.db")
                shutil.copy2(extracted, db_path)
                os.remove(extracted)
                return "ok"
            return "error: в архиве не найдена БД"

    return "error: неподдерживаемый формат"


def get_modules() -> list[dict]:
    return [
        {"key": k, "label": _(k)} for k in INCREMENTAL_MODULES
    ]


def _(key: str) -> str:
    labels = {
        "tickets": "Заявки",
        "clients": "Клиенты",
        "equipment": "Оборудование",
        "tasks": "Задачи",
        "inspections": "Проверки",
        "documents": "Документы",
        "settings": "Настройки",
        "users": "Пользователи",
    }
    return labels.get(key, key)


def list_backups() -> list:
    ensure_backup_dir()
    files = sorted(Path(BACKUP_DIR).glob("*.db"), key=os.path.getmtime, reverse=True)
    files.extend(sorted(Path(BACKUP_DIR).glob("*.zip"), key=os.path.getmtime, reverse=True))
    result = []
    seen = set()
    for f in files:
        if f.name in seen:
            continue
        seen.add(f.name)
        is_full = "full_backup" in f.name
        is_inc = "inc_backup" in f.name
        btype = "full" if is_full else ("incremental" if is_inc else "db_copy")
        result.append({
            "filename": f.name,
            "size": os.path.getsize(f),
            "type": btype,
            "created_at": datetime.fromtimestamp(os.path.getmtime(f)).isoformat(),
        })
    return result


def cleanup_old_backups():
    files = sorted(Path(BACKUP_DIR).glob("*"), key=os.path.getmtime)
    while len(files) > MAX_BACKUPS:
        try:
            os.remove(files[0])
        except:
            pass
        files = files[1:]


def auto_backup(db_path: str) -> str:
    result = backup_database(db_path)
    cleanup_old_backups()
    return result


def verify_integrity(db_path: str) -> dict:
    import sqlite3
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("PRAGMA integrity_check")
        result = cursor.fetchall()
        conn.close()
        ok = all(row[0] == "ok" for row in result)
        return {"ok": ok, "details": result}
    except Exception as e:
        return {"ok": False, "error": str(e)}
