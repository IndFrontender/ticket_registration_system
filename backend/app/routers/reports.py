import json
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from ..database import get_db
from ..models import ReportTemplate
from ..services.report_generator import generate_report, list_available_fields, FIELD_MAPS

router = APIRouter(prefix="/api/reports", tags=["reports"])


class ReportFilter(BaseModel):
    field: str
    op: str = "eq"
    value: str


class ReportRequest(BaseModel):
    entity_type: str
    columns: list[str]
    filters: list[ReportFilter] = []
    title: str = "Report"


class TemplateCreate(BaseModel):
    name: str
    entity_type: str
    columns: list[str]
    filters: list[dict] = []


@router.get("/fields/{entity_type}")
def get_fields(entity_type: str):
    fields = list_available_fields(entity_type)
    if not fields:
        raise HTTPException(404, f"Unknown entity type: {entity_type}")
    return {"fields": fields, "entity_type": entity_type}


@router.get("/entity-types")
def get_entity_types():
    return {"types": [
        {"key": "tickets", "label": "Заявки"},
        {"key": "clients", "label": "Клиенты"},
        {"key": "equipment", "label": "Оборудование"},
        {"key": "tasks", "label": "Задачи"},
        {"key": "inspections", "label": "Проверки"},
        {"key": "warranty_checks", "label": "Гарантийные ТО"},
    ]}


@router.post("/generate")
def generate_excel(data: ReportRequest, db: Session = Depends(get_db)):
    if data.entity_type not in FIELD_MAPS:
        raise HTTPException(400, f"Unknown entity type: {data.entity_type}")
    filters = [f.model_dump() for f in data.filters]
    try:
        excel_bytes = generate_report(
            entity_type=data.entity_type,
            columns=data.columns,
            filters=filters,
            title=data.title,
            db=db,
        )
        filename = f"report_{data.entity_type}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.xlsx"
        return Response(
            content=excel_bytes,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except Exception as e:
        raise HTTPException(500, f"Report generation failed: {e}")


@router.get("/templates")
def list_templates(db: Session = Depends(get_db)):
    items = db.query(ReportTemplate).order_by(ReportTemplate.updated_at.desc()).all()
    return {"items": [{
        "id": t.id, "name": t.name, "entity_type": t.entity_type,
        "columns": json.loads(t.columns),
        "filters": json.loads(t.filters) if t.filters else [],
        "created_at": str(t.created_at),
    } for t in items]}


@router.post("/templates", status_code=201)
def create_template(data: TemplateCreate, db: Session = Depends(get_db)):
    template = ReportTemplate(
        name=data.name,
        entity_type=data.entity_type,
        columns=json.dumps(data.columns),
        filters=json.dumps(data.filters),
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return {"id": template.id, "message": "Template saved"}


@router.delete("/templates/{template_id}")
def delete_template(template_id: int, db: Session = Depends(get_db)):
    t = db.query(ReportTemplate).filter(ReportTemplate.id == template_id).first()
    if not t:
        raise HTTPException(404, "Template not found")
    db.delete(t)
    db.commit()
    return {"message": "Template deleted"}
