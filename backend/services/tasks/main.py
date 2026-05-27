"""
Microservice: Tasks Notebook (личный блокнот задач)
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel

from app.database import get_db, engine, Base
from app.models import Task

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Tasks Service", version="1.0.0")


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


@app.get("/health")
def health():
    return {"service": "tasks", "status": "ok"}


@app.get("/tasks")
def list_tasks(
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    q = db.query(Task)
    if status:
        q = q.filter(Task.status == status)
    if category:
        q = q.filter(Task.category == category)
    if priority:
        q = q.filter(Task.priority == priority)
    if search:
        s = f"%{search}%"
        q = q.filter(Task.title.ilike(s) | Task.description.ilike(s))

    total = q.count()
    items = q.order_by(Task.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return {"items": [{
        "id": t.id, "title": t.title, "description": t.description,
        "category": t.category, "priority": t.priority, "status": t.status,
        "due_date": str(t.due_date) if t.due_date else None,
        "completed_at": str(t.completed_at) if t.completed_at else None,
        "ticket_id": t.ticket_id,
        "created_at": str(t.created_at),
    } for t in items], "total": total}


@app.get("/tasks/weekly")
def weekly_tasks(db: Session = Depends(get_db)):
    """Get tasks for the current week (Monday-Sunday)"""
    today = date.today()
    monday = today - __import__('datetime').timedelta(days=today.weekday())
    sunday = monday + __import__('datetime').timedelta(days=6)

    items = db.query(Task).filter(
        Task.due_date.between(monday, sunday) |
        (Task.created_at >= datetime.combine(monday, datetime.min.time()))
    ).order_by(Task.priority.desc(), Task.due_date.asc()).all()

    return {"week": f"{monday} - {sunday}", "items": [{
        "id": t.id, "title": t.title, "category": t.category,
        "priority": t.priority, "status": t.status,
        "due_date": str(t.due_date) if t.due_date else None,
    } for t in items]}


@app.post("/tasks", status_code=201)
def create_task(data: TaskCreate, db: Session = Depends(get_db)):
    task = Task(**data.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)
    return {"id": task.id, "message": "Task created"}


@app.put("/tasks/{task_id}")
def update_task(task_id: int, data: TaskUpdate, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(404, "Task not found")
    update = data.model_dump(exclude_unset=True)
    if update.get("status") == "completed" and not task.completed_at:
        update["completed_at"] = datetime.utcnow()
    for k, v in update.items():
        setattr(task, k, v)
    db.commit()
    return {"message": "Task updated"}


@app.put("/tasks/{task_id}/complete")
def complete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(404, "Task not found")
    task.status = "completed"
    task.completed_at = datetime.utcnow()
    db.commit()
    return {"message": "Task completed"}
