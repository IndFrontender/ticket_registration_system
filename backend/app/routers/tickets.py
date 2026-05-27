from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc
from typing import Optional, List
from datetime import datetime
import os
import uuid

from ..database import get_db
from ..models import Ticket, Client, Attachment, TicketHistory, WarrantyChecklist, StatusEnum, PriorityEnum, ClientTypeEnum
from ..schemas import TicketCreate, TicketUpdate, TicketResponse, TicketListItem
from ..services.priority_detector import detect_priority
from ..services.notification_service import NotificationService

router = APIRouter(prefix="/api/tickets", tags=["tickets"])
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def generate_ticket_number(db: Session) -> str:
    today = datetime.utcnow()
    count = db.query(Ticket).filter(
        Ticket.created_at >= today.replace(hour=0, minute=0, second=0, microsecond=0)
    ).count()
    return f"TKT-{today.strftime('%Y%m%d')}-{count + 1:04d}"


@router.get("")
def list_tickets(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(Ticket).join(Client, isouter=True)

    if status:
        query = query.filter(Ticket.status == status)
    if priority:
        query = query.filter(Ticket.priority == priority)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Ticket.number.ilike(search_term),
                Ticket.short_description.ilike(search_term),
                Client.name.ilike(search_term),
            )
        )

    sort_column = getattr(Ticket, sort_by, Ticket.created_at)
    if sort_order == "desc":
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(asc(sort_column))

    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    result = []
    for t in items:
        result.append({
            "id": t.id,
            "number": t.number,
            "created_at": t.created_at.isoformat(),
            "updated_at": t.updated_at.isoformat(),
            "status": t.status.value,
            "priority": t.priority.value,
            "deadline": t.deadline.isoformat() if t.deadline else None,
            "client_name": t.client.name if t.client else None,
            "short_description": t.short_description,
        })

    return {
        "items": result,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.get("/{ticket_id}")
def get_ticket(ticket_id: int, db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(404, "Заявка не найдена")

    return {
        "id": ticket.id,
        "number": ticket.number,
        "created_at": ticket.created_at.isoformat(),
        "updated_at": ticket.updated_at.isoformat(),
        "status": ticket.status.value,
        "priority": ticket.priority.value,
        "deadline": ticket.deadline.isoformat() if ticket.deadline else None,
        "work_date": ticket.work_date.isoformat() if ticket.work_date else None,
        "review_date": ticket.review_date.isoformat() if ticket.review_date else None,
        "warranty_months": ticket.warranty_months or 0,
        "warranty_end_date": ticket.warranty_end_date.isoformat() if ticket.warranty_end_date else None,
        "short_description": ticket.short_description,
        "full_description": ticket.full_description,
        "client": {
            "id": ticket.client.id,
            "client_type": ticket.client.client_type.value,
            "name": ticket.client.name,
            "phone": ticket.client.phone,
            "email": ticket.client.email,
            "address": ticket.client.address,
            "inn": ticket.client.inn,
            "kpp": ticket.client.kpp,
        } if ticket.client else None,
        "attachments": [{"id": a.id, "filename": a.filename, "filepath": a.filepath, "mime_type": a.mime_type} for a in ticket.attachments],
        "documents": [{
            "id": d.id, "doc_type": d.doc_type, "number": d.number,
            "created_at": d.created_at.isoformat(), "total_amount": d.total_amount,
            "warranty_period": d.warranty_period,
            "items": [{"id": i.id, "service_name": i.service_name, "quantity": i.quantity, "price": i.price, "total": i.total} for i in d.items]
        } for d in ticket.documents],
        "history": [{"id": h.id, "action": h.action, "description": h.description, "created_at": h.created_at.isoformat(), "user": h.user} for h in ticket.history],
    }


@router.post("", status_code=201)
def create_ticket(data: TicketCreate, db: Session = Depends(get_db)):
    client = None
    if data.client_id:
        client = db.query(Client).filter(Client.id == data.client_id).first()
        if not client:
            raise HTTPException(404, "Клиент не найден")
    elif data.client:
        client = Client(**data.client.model_dump())
        db.add(client)
        db.flush()

    if not client:
        raise HTTPException(400, "Необходимо указать клиента")

    priority = data.priority or detect_priority(data.full_description or data.short_description)

    ticket = Ticket(
        number=generate_ticket_number(db),
        client=client,
        short_description=data.short_description,
        full_description=data.full_description,
        priority=priority,
        deadline=data.deadline,
        work_date=data.work_date,
        review_date=data.review_date,
        warranty_months=data.warranty_months or 0,
    )
    if ticket.warranty_months and ticket.warranty_months > 0:
        from datetime import timedelta
        ticket.warranty_end_date = (data.work_date or datetime.utcnow()) + timedelta(days=30 * ticket.warranty_months)

    db.add(ticket)
    db.flush()

    history = TicketHistory(
        ticket_id=ticket.id,
        action="created",
        description="Заявка создана",
        user="system"
    )
    db.add(history)

    if ticket.warranty_months and ticket.warranty_months > 0:
        from datetime import timedelta
        base_date = data.work_date or datetime.utcnow()
        if isinstance(base_date, datetime):
            base_date = base_date.date()
        for month in range(1, ticket.warranty_months + 1):
            check_date = base_date + timedelta(days=30 * month)
            wc = WarrantyChecklist(
                ticket_id=ticket.id, check_date=check_date,
                month_number=month, status="pending",
                notes="Автоматически создана при оформлении гарантии"
            )
            db.add(wc)

    db.commit()
    db.refresh(ticket)

    return get_ticket(ticket.id, db)


@router.put("/{ticket_id}")
def update_ticket(ticket_id: int, data: TicketUpdate, db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(404, "Заявка не найдена")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(ticket, key, value)

    if "status" in update_data:
        history = TicketHistory(
            ticket_id=ticket.id,
            action="status_changed",
            description=f"Статус изменён на {data.status.value}",
            user="operator"
        )
        db.add(history)
    if "priority" in update_data:
        history = TicketHistory(
            ticket_id=ticket.id,
            action="priority_changed",
            description=f"Приоритет изменён на {data.priority.value}",
            user="operator"
        )
        db.add(history)

    db.commit()
    db.refresh(ticket)
    return get_ticket(ticket.id, db)


@router.post("/{ticket_id}/attachments")
async def upload_attachment(ticket_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(404, "Заявка не найдена")

    ext = file.filename.split(".")[-1] if "." in file.filename else ""
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    attachment = Attachment(
        filename=file.filename,
        filepath=filepath,
        mime_type=file.content_type or "application/octet-stream",
        ticket_id=ticket_id,
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)

    return {"id": attachment.id, "filename": attachment.filename, "filepath": attachment.filepath, "mime_type": attachment.mime_type}


@router.post("/{ticket_id}/notify")
async def notify_ticket(ticket_id: int, db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(404, "Заявка не найдена")

    client = ticket.client
    if client:
        await NotificationService.notify_client_ticket_created(
            ticket.number, client.name, ticket.status.value,
            client.email, client.phone
        )

    return {"message": "Уведомления отправлены"}


@router.get("/stats/summary")
def get_stats(db: Session = Depends(get_db)):
    total = db.query(Ticket).count()
    by_status = {}
    for s in StatusEnum:
        count = db.query(Ticket).filter(Ticket.status == s).count()
        by_status[s.value] = count
    by_priority = {}
    for p in PriorityEnum:
        count = db.query(Ticket).filter(Ticket.priority == p).count()
        by_priority[p.value] = count
    return {"total": total, "by_status": by_status, "by_priority": by_priority}
