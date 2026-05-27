"""
Microservice: Inspection Checklists (проверки, гарантия, напоминания)
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date, datetime, timedelta
from typing import Optional
from pydantic import BaseModel

from app.database import get_db, engine, Base
from app.models import InspectionReport, InspectionFile, WarrantyChecklist, Notification

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Checklists Service", version="1.0.0")


class InspectionCreate(BaseModel):
    ticket_id: int
    report_date: date
    report_type: str = "monthly"
    notes: Optional[str] = None

class InspectionUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    client_confirmed: Optional[bool] = None
    client_response: Optional[str] = None

class WarrantyCheckCreate(BaseModel):
    ticket_id: int
    check_date: date
    month_number: int
    notes: Optional[str] = None


@app.get("/health")
def health():
    return {"service": "checklists", "status": "ok"}

@app.get("/inspections")
def list_inspections(ticket_id: Optional[int] = Query(None), status: Optional[str] = Query(None),
    report_type: Optional[str] = Query(None), from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None), page: int = Query(1, ge=1), page_size: int = Query(20, ge=1),
    db: Session = Depends(get_db)):
    q = db.query(InspectionReport)
    if ticket_id: q = q.filter(InspectionReport.ticket_id == ticket_id)
    if status: q = q.filter(InspectionReport.status == status)
    if report_type: q = q.filter(InspectionReport.report_type == report_type)
    if from_date: q = q.filter(InspectionReport.report_date >= from_date)
    if to_date: q = q.filter(InspectionReport.report_date <= to_date)
    total = q.count()
    items = q.order_by(InspectionReport.report_date.desc()).offset((page-1)*page_size).limit(page_size).all()
    return {"items": [{"id": i.id, "ticket_id": i.ticket_id, "report_date": str(i.report_date),
        "report_type": i.report_type, "status": i.status, "notes": i.notes,
        "client_confirmed": i.client_confirmed, "client_response": i.client_response,
        "files_count": len(i.files)} for i in items], "total": total}

@app.post("/inspections", status_code=201)
def create_inspection(data: InspectionCreate, db: Session = Depends(get_db)):
    insp = InspectionReport(**data.model_dump())
    db.add(insp); db.commit(); db.refresh(insp)
    return {"id": insp.id, "message": "Inspection created"}

@app.put("/inspections/{insp_id}")
def update_inspection(insp_id: int, data: InspectionUpdate, db: Session = Depends(get_db)):
    insp = db.query(InspectionReport).filter(InspectionReport.id == insp_id).first()
    if not insp: raise HTTPException(404, "Inspection not found")
    for k, v in data.model_dump(exclude_unset=True).items(): setattr(insp, k, v)
    db.commit()
    return {"message": "Inspection updated"}

# ---- Warranty Checks ----
@app.get("/warranty-checks")
def list_warranty_checks(ticket_id: Optional[int] = Query(None), status: Optional[str] = Query(None),
    month: Optional[int] = Query(None), db: Session = Depends(get_db)):
    q = db.query(WarrantyChecklist)
    if ticket_id: q = q.filter(WarrantyChecklist.ticket_id == ticket_id)
    if status: q = q.filter(WarrantyChecklist.status == status)
    if month: q = q.filter(WarrantyChecklist.month_number == month)
    items = q.order_by(WarrantyChecklist.check_date.desc()).all()
    return {"items": [{"id": w.id, "ticket_id": w.ticket_id, "check_date": str(w.check_date),
        "month_number": w.month_number, "status": w.status, "notes": w.notes,
        "files_attached": w.files_attached} for w in items]}

@app.post("/warranty-checks", status_code=201)
def create_warranty_check(data: WarrantyCheckCreate, db: Session = Depends(get_db)):
    wc = WarrantyChecklist(**data.model_dump())
    db.add(wc); db.commit(); db.refresh(wc)
    return {"id": wc.id, "message": "Warranty check created"}

@app.put("/warranty-checks/{wc_id}/complete")
def complete_warranty_check(wc_id: int, db: Session = Depends(get_db)):
    wc = db.query(WarrantyChecklist).filter(WarrantyChecklist.id == wc_id).first()
    if not wc: raise HTTPException(404, "Warranty check not found")
    wc.status = "completed"
    wc.completed_at = datetime.utcnow()
    db.commit()
    return {"message": "Warranty check completed"}

# ---- Auto-generate warranty checks ----
@app.post("/warranty-checks/generate/{ticket_id}")
def generate_warranty_checks(ticket_id: int, db: Session = Depends(get_db)):
    from app.models import Ticket
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket: raise HTTPException(404, "Ticket not found")
    if not ticket.warranty_months or ticket.warranty_months < 1:
        raise HTTPException(400, "Ticket has no warranty period")

    created = []
    for month in range(1, ticket.warranty_months + 1):
        existing = db.query(WarrantyChecklist).filter(
            WarrantyChecklist.ticket_id == ticket_id,
            WarrantyChecklist.month_number == month
        ).first()
        if not existing:
            check_date = (ticket.created_at + timedelta(days=30*month)).date()
            wc = WarrantyChecklist(ticket_id=ticket_id, check_date=check_date,
                month_number=month, status="pending")
            db.add(wc)
            created.append(month)
    db.commit()
    return {"message": f"Generated {len(created)} warranty checks", "months": created}

# ---- Reminders / Notifications ----
@app.get("/reminders/upcoming")
def upcoming_reminders(days: int = Query(7), db: Session = Depends(get_db)):
    today = date.today()
    deadline = today + timedelta(days=days)
    items = []
    # Warranty checks due
    wcs = db.query(WarrantyChecklist).filter(
        WarrantyChecklist.check_date.between(today, deadline),
        WarrantyChecklist.status == "pending"
    ).all()
    for w in wcs:
        items.append({"type": "warranty_check", "id": w.id, "ticket_id": w.ticket_id,
            "title": f"Warranty check month {w.month_number}", "date": str(w.check_date)})
    # Inspection reports due
    inspections = db.query(InspectionReport).filter(
        InspectionReport.report_date.between(today, deadline),
        InspectionReport.status == "pending"
    ).all()
    for i in inspections:
        items.append({"type": "inspection", "id": i.id, "ticket_id": i.ticket_id,
            "title": f"Inspection: {i.report_type}", "date": str(i.report_date)})
    return {"items": items}
