from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from datetime import datetime

from ..database import get_db
from ..models import Ticket, Document, DocumentItem, UserModel
from ..schemas import DocumentCreate
from ..services.cheque_maker import generate_document_html, generate_document_pdf
from .auth import get_current_user, require_admin

router = APIRouter(prefix="/api/documents", tags=["documents"])


def generate_doc_number(doc_type: str, db: Session) -> str:
    today = datetime.utcnow()
    prefix = {
        "receipt": "CH",
        "warranty": "GT",
        "invoice": "SCH",
        "act": "AKT",
    }.get(doc_type, "DOC")
    count = db.query(Document).filter(
        Document.created_at >= today.replace(hour=0, minute=0, second=0, microsecond=0)
    ).count() + 1
    return f"{prefix}-{today.strftime('%Y%m%d')}-{count:04d}"


@router.get("")
def list_documents(
    ticket_id: int | None = Query(None),
    doc_type: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    q = db.query(Document)
    if ticket_id:
        q = q.filter(Document.ticket_id == ticket_id)
    if doc_type:
        q = q.filter(Document.doc_type == doc_type)
    total = q.count()
    items = q.order_by(Document.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {
        "items": [{
            "id": d.id, "doc_type": d.doc_type, "number": d.number,
            "created_at": d.created_at.isoformat(),
            "ticket_id": d.ticket_id, "total_amount": d.total_amount,
            "warranty_period": d.warranty_period,
        } for d in items],
        "total": total, "page": page, "page_size": page_size,
    }


@router.post("/{ticket_id}", status_code=201)
def create_document(
    ticket_id: int, data: DocumentCreate, db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(404, "Заявка не найдена")

    doc = Document(
        doc_type=data.doc_type,
        number=generate_doc_number(data.doc_type, db),
        ticket_id=ticket_id,
        total_amount=data.total_amount,
        warranty_period=data.warranty_period,
    )
    db.add(doc)
    db.flush()

    for item_data in data.items:
        item = DocumentItem(
            document_id=doc.id,
            service_name=item_data.service_name,
            quantity=item_data.quantity,
            price=item_data.price,
            total=item_data.total or item_data.quantity * item_data.price,
        )
        db.add(item)

    db.commit()
    db.refresh(doc)
    return get_document(doc.id, db)


@router.get("/{document_id}")
def get_document(document_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(404, "Документ не найден")
    return {
        "id": doc.id,
        "doc_type": doc.doc_type,
        "number": doc.number,
        "created_at": doc.created_at.isoformat(),
        "ticket_id": doc.ticket_id,
        "total_amount": doc.total_amount,
        "warranty_period": doc.warranty_period,
        "items": [{
            "id": i.id, "service_name": i.service_name,
            "quantity": i.quantity, "price": i.price, "total": i.total
        } for i in doc.items],
    }


@router.get("/{document_id}/html")
def get_document_html(
    document_id: int, db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(404, "Документ не найден")
    ticket = doc.ticket
    html = generate_document_html(ticket, doc, current_user.full_name or current_user.username)
    return Response(content=html, media_type="text/html; charset=utf-8")


@router.get("/{document_id}/pdf")
def get_document_pdf(
    document_id: int, db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(404, "Документ не найден")
    ticket = doc.ticket
    pdf_bytes = generate_document_pdf(ticket, doc, current_user.full_name or current_user.username)
    media = "application/pdf" if not isinstance(pdf_bytes, bytes) or pdf_bytes[0:4] == b"%PDF" else "text/html; charset=utf-8"
    return Response(
        content=pdf_bytes,
        media_type=media,
        headers={"Content-Disposition": f"attachment; filename=\"doc_{doc.number}.{'pdf' if media == 'application/pdf' else 'html'}\""}
    )


@router.delete("/{document_id}")
def delete_document(
    document_id: int, db: Session = Depends(get_db),
    admin: UserModel = Depends(require_admin),
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(404, "Документ не найден")
    db.delete(doc)
    db.commit()
    return {"message": "Документ удалён"}
