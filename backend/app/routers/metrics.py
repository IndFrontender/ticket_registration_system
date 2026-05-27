from fastapi import APIRouter, Depends
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
from ..database import get_db
from ..services.metrics_service import generate_prometheus_metrics, generate_analytics

router = APIRouter(tags=["metrics"])


@router.get("/metrics")
def prometheus_metrics(db: Session = Depends(get_db)):
    return PlainTextResponse(generate_prometheus_metrics(db))


@router.get("/api/analytics")
def analytics(db: Session = Depends(get_db)):
    return generate_analytics(db)


@router.get("/api/healthz")
def healthz():
    return {"status": "ok"}
