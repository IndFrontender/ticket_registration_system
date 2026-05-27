from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc
from typing import Optional

from ..database import get_db
from ..models import Client
from ..schemas import ClientCreate, ClientResponse

router = APIRouter(prefix="/api/clients", tags=["clients"])


@router.get("")
def list_clients(
    search: Optional[str] = Query(None),
    sort_by: str = Query("name"),
    sort_order: str = Query("asc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(Client)
    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(Client.name.ilike(term), Client.phone.ilike(term), Client.email.ilike(term))
        )

    sort_col = getattr(Client, sort_by, Client.name)
    if sort_order == "desc":
        query = query.order_by(desc(sort_col))
    else:
        query = query.order_by(asc(sort_col))

    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": [{
            "id": c.id, "client_type": c.client_type.value,
            "name": c.name, "phone": c.phone, "email": c.email,
            "address": c.address, "inn": c.inn, "kpp": c.kpp,
        } for c in items],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/{client_id}")
def get_client(client_id: int, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(404, "Клиент не найден")
    return {
        "id": client.id, "client_type": client.client_type.value,
        "name": client.name, "phone": client.phone, "email": client.email,
        "address": client.address, "inn": client.inn, "kpp": client.kpp,
    }


@router.post("", status_code=201)
def create_client(data: ClientCreate, db: Session = Depends(get_db)):
    client = Client(**data.model_dump())
    db.add(client)
    db.commit()
    db.refresh(client)
    return {
        "id": client.id, "client_type": client.client_type.value,
        "name": client.name, "phone": client.phone, "email": client.email,
        "address": client.address, "inn": client.inn, "kpp": client.kpp,
    }


@router.put("/{client_id}")
def update_client(client_id: int, data: ClientCreate, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(404, "Клиент не найден")
    for key, value in data.model_dump().items():
        setattr(client, key, value)
    db.commit()
    db.refresh(client)
    return {
        "id": client.id, "client_type": client.client_type.value,
        "name": client.name, "phone": client.phone, "email": client.email,
        "address": client.address, "inn": client.inn, "kpp": client.kpp,
    }


@router.delete("/{client_id}")
def delete_client(client_id: int, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(404, "Клиент не найден")
    db.delete(client)
    db.commit()
    return {"message": "Клиент удалён"}
