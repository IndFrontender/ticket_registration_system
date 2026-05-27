from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from pydantic import BaseModel
from datetime import datetime

from ..services.mongo_service import (
    get_mongo, log_sms, log_audit, get_sms_logs, get_audit_log,
    get_equipment_logs, store_file_meta,
)

router = APIRouter(prefix="/api/nosql", tags=["nosql"])


class SmsCreate(BaseModel):
    client_id: int
    client_name: str
    phone: str
    direction: str = "sent"
    message: str
    ticket_id: Optional[int] = None


class AuditCreate(BaseModel):
    user: str
    action: str
    entity_type: str
    entity_id: int
    changes: Optional[dict] = None


@router.get("/status")
def mongo_status():
    db = get_mongo()
    if db is None:
        return {"status": "disconnected", "message": "MongoDB недоступна"}
    try:
        info = db.command("serverStatus")
        return {
            "status": "connected",
            "version": info.get("version", ""),
            "collections": db.list_collection_names(),
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.post("/sms", status_code=201)
def create_sms(data: SmsCreate):
    result = log_sms(**data.model_dump())
    if result is None:
        raise HTTPException(503, "MongoDB недоступна")
    return {"id": str(result.inserted_id), "message": "SMS записан"}


@router.get("/sms")
def list_sms(client_id: Optional[int] = Query(None), ticket_id: Optional[int] = Query(None)):
    return {"items": get_sms_logs(client_id, ticket_id)}


@router.post("/audit", status_code=201)
def create_audit(data: AuditCreate):
    result = log_audit(**data.model_dump())
    if result is None:
        raise HTTPException(503, "MongoDB недоступна")
    return {"id": str(result.inserted_id), "message": "Запись аудита создана"}


@router.get("/audit")
def list_audit(entity_type: Optional[str] = Query(None), entity_id: Optional[int] = Query(None)):
    return {"items": get_audit_log(entity_type, entity_id)}


@router.get("/collections")
def list_collections():
    db = get_mongo()
    if db is None:
        raise HTTPException(503, "MongoDB недоступна")
    return {"collections": db.list_collection_names()}
