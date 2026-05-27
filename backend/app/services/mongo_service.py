import os
from datetime import datetime
from typing import Optional

MONGO_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017/ticket_system_nosql")


def get_mongo():
    try:
        from pymongo import MongoClient
        client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=3000)
        db = client.get_default_database()
        db.command("ping")
        return db
    except Exception as e:
        return None


def get_collection(name: str):
    db = get_mongo()
    if db is not None:
        return db[name]
    return None


def log_sms(client_id: int, client_name: str, phone: str, direction: str, message: str,
            ticket_id: Optional[int] = None, screenshot_file_id: Optional[str] = None):
    coll = get_collection("sms_logs")
    if coll is None: return None
    return coll.insert_one({
        "client_id": client_id, "client_name": client_name, "phone": phone,
        "direction": direction, "message": message, "ticket_id": ticket_id,
        "screenshot_file_id": screenshot_file_id, "status": "sent",
        "timestamp": datetime.utcnow(), "tags": [],
    })


def log_audit(user: str, action: str, entity_type: str, entity_id: int,
              changes: Optional[dict] = None, ip: Optional[str] = None, ua: Optional[str] = None):
    coll = get_collection("audit_log")
    if coll is None: return None
    return coll.insert_one({
        "user": user, "action": action, "entity_type": entity_type,
        "entity_id": entity_id, "changes": changes or {},
        "ip_address": ip, "user_agent": ua, "timestamp": datetime.utcnow(),
    })


def store_file_meta(filename: str, original_name: str, mime_type: str, size: int,
                    uploaded_by: str, entity_type: str = None, entity_id: int = None, tags: list = None):
    coll = get_collection("files")
    if coll is None: return None
    doc = {
        "filename": filename, "original_name": original_name, "mime_type": mime_type,
        "size": size, "uploaded_by": uploaded_by, "uploaded_at": datetime.utcnow(),
        "tags": tags or [],
    }
    if entity_type and entity_id:
        doc["related_to"] = {"entity_type": entity_type, "entity_id": entity_id}
    return coll.insert_one(doc)


def get_sms_logs(client_id: int = None, ticket_id: int = None, limit: int = 50):
    coll = get_collection("sms_logs")
    if coll is None: return []
    q = {}
    if client_id: q["client_id"] = client_id
    if ticket_id: q["ticket_id"] = ticket_id
    return list(coll.find(q, {"_id": 0}).sort("timestamp", -1).limit(limit))


def get_audit_log(entity_type: str = None, entity_id: int = None, limit: int = 50):
    coll = get_collection("audit_log")
    if coll is None: return []
    q = {}
    if entity_type: q["entity_type"] = entity_type
    if entity_id: q["entity_id"] = entity_id
    return list(coll.find(q, {"_id": 0}).sort("timestamp", -1).limit(limit))


def get_equipment_logs(equipment_id: int = None, limit: int = 50):
    coll = get_collection("equipment_logs")
    if coll is None: return []
    q = {}
    if equipment_id: q["equipment_id"] = equipment_id
    return list(coll.find(q, {"_id": 0}).sort("timestamp", -1).limit(limit))
