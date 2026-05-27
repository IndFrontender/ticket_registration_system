"""
Microservice: Equipment Management (принтеры, ККТ, СВН, ТО)
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date, datetime, timedelta
from typing import Optional, List
from pydantic import BaseModel

from app.database import get_db, engine, Base
from app.models import Equipment, EquipmentMaintenance, EquipmentReminder

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Equipment Service", version="1.0.0")


class EquipmentCreate(BaseModel):
    equipment_type: str
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    inventory_number: Optional[str] = None
    location: Optional[str] = None
    client_id: Optional[int] = None
    purchase_date: Optional[date] = None
    warranty_expiry: Optional[date] = None
    status: str = "active"
    notes: Optional[str] = None


class MaintenanceCreate(BaseModel):
    equipment_id: int
    maintenance_type: str
    description: str
    replaced_parts: Optional[str] = None
    work_date: date
    next_maintenance_date: Optional[date] = None
    ticket_id: Optional[int] = None
    cost: float = 0.0
    notes: Optional[str] = None


class ReminderCreate(BaseModel):
    equipment_id: int
    title: str
    description: Optional[str] = None
    reminder_date: date
    repeat_interval: Optional[str] = None


@app.get("/health")
def health():
    return {"service": "equipment", "status": "ok"}


# ---- Equipment CRUD ----

@app.get("/equipment")
def list_equipment(
    equipment_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    client_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    q = db.query(Equipment)
    if equipment_type:
        q = q.filter(Equipment.equipment_type == equipment_type)
    if status:
        q = q.filter(Equipment.status == status)
    if client_id:
        q = q.filter(Equipment.client_id == client_id)
    if search:
        s = f"%{search}%"
        q = q.filter(
            Equipment.manufacturer.ilike(s) |
            Equipment.model.ilike(s) |
            Equipment.serial_number.ilike(s) |
            Equipment.inventory_number.ilike(s)
        )
    total = q.count()
    items = q.offset((page - 1) * page_size).limit(page_size).all()
    return {"items": [{"id": e.id, "equipment_type": e.equipment_type, "manufacturer": e.manufacturer,
                       "model": e.model, "serial_number": e.serial_number, "status": e.status,
                       "client_id": e.client_id, "location": e.location} for e in items],
            "total": total, "page": page, "page_size": page_size}


@app.get("/equipment/{eq_id}")
def get_equipment(eq_id: int, db: Session = Depends(get_db)):
    eq = db.query(Equipment).filter(Equipment.id == eq_id).first()
    if not eq:
        raise HTTPException(404, "Equipment not found")
    return {
        "id": eq.id, "equipment_type": eq.equipment_type,
        "manufacturer": eq.manufacturer, "model": eq.model,
        "serial_number": eq.serial_number, "inventory_number": eq.inventory_number,
        "location": eq.location, "client_id": eq.client_id,
        "purchase_date": str(eq.purchase_date) if eq.purchase_date else None,
        "warranty_expiry": str(eq.warranty_expiry) if eq.warranty_expiry else None,
        "status": eq.status, "notes": eq.notes,
        "created_at": str(eq.created_at),
    }


@app.post("/equipment", status_code=201)
def create_equipment(data: EquipmentCreate, db: Session = Depends(get_db)):
    eq = Equipment(**data.model_dump())
    db.add(eq)
    db.commit()
    db.refresh(eq)
    return {"id": eq.id, "message": "Equipment created"}


@app.put("/equipment/{eq_id}")
def update_equipment(eq_id: int, data: EquipmentCreate, db: Session = Depends(get_db)):
    eq = db.query(Equipment).filter(Equipment.id == eq_id).first()
    if not eq:
        raise HTTPException(404, "Equipment not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(eq, k, v)
    db.commit()
    return {"message": "Equipment updated"}


# ---- Maintenance ----

@app.get("/equipment/{eq_id}/maintenance")
def list_maintenance(eq_id: int, db: Session = Depends(get_db)):
    items = db.query(EquipmentMaintenance).filter(
        EquipmentMaintenance.equipment_id == eq_id
    ).order_by(EquipmentMaintenance.work_date.desc()).all()
    return {"items": [{
        "id": m.id, "maintenance_type": m.maintenance_type,
        "description": m.description, "replaced_parts": m.replaced_parts,
        "work_date": str(m.work_date),
        "next_maintenance_date": str(m.next_maintenance_date) if m.next_maintenance_date else None,
        "cost": m.cost, "notes": m.notes
    } for m in items]}


@app.post("/maintenance", status_code=201)
def create_maintenance(data: MaintenanceCreate, db: Session = Depends(get_db)):
    m = EquipmentMaintenance(**data.model_dump())
    db.add(m)
    db.commit()
    db.refresh(m)
    return {"id": m.id, "message": "Maintenance record created"}


# ---- Reminders ----

@app.get("/equipment/{eq_id}/reminders")
def list_reminders(eq_id: int, db: Session = Depends(get_db)):
    items = db.query(EquipmentReminder).filter(
        EquipmentReminder.equipment_id == eq_id
    ).order_by(EquipmentReminder.reminder_date.asc()).all()
    return {"items": [{
        "id": r.id, "title": r.title, "description": r.description,
        "reminder_date": str(r.reminder_date),
        "repeat_interval": r.repeat_interval, "is_completed": r.is_completed
    } for r in items]}


@app.post("/reminders", status_code=201)
def create_reminder(data: ReminderCreate, db: Session = Depends(get_db)):
    r = EquipmentReminder(**data.model_dump())
    db.add(r)
    db.commit()
    db.refresh(r)
    return {"id": r.id, "message": "Reminder created"}


@app.get("/reminders/due")
def due_reminders(days: int = Query(7), db: Session = Depends(get_db)):
    today = date.today()
    deadline = today + timedelta(days=days)
    items = db.query(EquipmentReminder).filter(
        EquipmentReminder.reminder_date.between(today, deadline),
        EquipmentReminder.is_completed == False
    ).all()
    return {"items": [{
        "id": r.id, "equipment_id": r.equipment_id,
        "title": r.title, "reminder_date": str(r.reminder_date)
    } for r in items]}
