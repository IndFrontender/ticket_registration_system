from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date, datetime, timedelta
from typing import Optional
from pydantic import BaseModel

from ..database import get_db
from ..models import Task

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    priority: str = "medium"
    due_date: Optional[date] = None
    ticket_id: Optional[int] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[date] = None


def _task_to_dict(t):
    return {
        "id": t.id, "title": t.title, "description": t.description,
        "category": t.category, "priority": t.priority, "status": t.status,
        "due_date": str(t.due_date) if t.due_date else None,
        "completed_at": str(t.completed_at) if t.completed_at else None,
        "ticket_id": t.ticket_id, "created_at": str(t.created_at),
    }


@router.get("")
def list_tasks(
    status: Optional[str] = Query(None), category: Optional[str] = Query(None),
    priority: Optional[str] = Query(None), search: Optional[str] = Query(None),
    page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    q = db.query(Task)
    if status: q = q.filter(Task.status == status)
    if category: q = q.filter(Task.category == category)
    if priority: q = q.filter(Task.priority == priority)
    if search:
        s = f"%{search}%"
        q = q.filter(Task.title.ilike(s) | Task.description.ilike(s))
    total = q.count()
    items = q.order_by(Task.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"items": [_task_to_dict(t) for t in items], "total": total}


@router.get("/categories")
def list_categories(db: Session = Depends(get_db)):
    cats = db.query(Task.category).distinct().all()
    return {"categories": [c[0] for c in cats if c[0]]}


@router.get("/weekly")
def weekly_tasks(db: Session = Depends(get_db)):
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    sunday = monday + timedelta(days=6)
    items = db.query(Task).filter(
        Task.due_date.between(monday, sunday) |
        (Task.created_at >= datetime.combine(monday, datetime.min.time()))
    ).order_by(Task.priority, Task.due_date.asc()).all()
    return {"week": f"{monday} - {sunday}", "items": [_task_to_dict(t) for t in items]}


@router.get("/stats")
def task_stats(db: Session = Depends(get_db)):
    total = db.query(Task).count()
    pending = db.query(Task).filter(Task.status == "pending").count()
    completed = db.query(Task).filter(Task.status == "completed").count()
    in_progress = db.query(Task).filter(Task.status == "in_progress").count()
    overdue = db.query(Task).filter(Task.due_date < date.today(), Task.status != "completed").count()
    return {"total": total, "pending": pending, "completed": completed,
            "in_progress": in_progress, "overdue": overdue}


@router.get("/{task_id}")
def get_task(task_id: int, db: Session = Depends(get_db)):
    t = db.query(Task).filter(Task.id == task_id).first()
    if not t: raise HTTPException(404, "Задача не найдена")
    return _task_to_dict(t)


@router.post("", status_code=201)
def create_task(data: TaskCreate, db: Session = Depends(get_db)):
    task = Task(**data.model_dump())
    db.add(task); db.commit(); db.refresh(task)
    return _task_to_dict(task)


@router.put("/{task_id}")
def update_task(task_id: int, data: TaskUpdate, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task: raise HTTPException(404, "Задача не найдена")
    update = data.model_dump(exclude_unset=True)
    if update.get("status") == "completed" and not task.completed_at:
        update["completed_at"] = datetime.utcnow()
    for k, v in update.items(): setattr(task, k, v)
    db.commit()
    return _task_to_dict(task)


@router.delete("/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task: raise HTTPException(404, "Задача не найдена")
    db.delete(task); db.commit()
    return {"message": "Задача удалена"}
