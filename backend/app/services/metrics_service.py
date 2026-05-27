import time
import os
import platform
import psutil
from datetime import datetime, date, timedelta
from collections import defaultdict
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..models import Ticket, Client, Task, Equipment, EquipmentMaintenance, WarrantyChecklist, InspectionReport, Notification

# Process start time for uptime
PROCESS_START = time.time()

# Request counters
request_count = 0
request_durations = []
METHODS = ("GET", "POST", "PUT", "DELETE", "PATCH")


class MetricsCollector:
    def __init__(self):
        self.reset()

    def reset(self):
        self.counts = {m: 0 for m in METHODS}
        self.errors = 0
        self.last_minute_counts = []

    def inc(self, method: str):
        self.counts[method] = self.counts.get(method, 0) + 1
        global request_count
        request_count += 1

    def inc_error(self):
        self.errors += 1

    def add_duration(self, ms: float):
        global request_durations
        request_durations.append(ms)
        if len(request_durations) > 1000:
            request_durations = request_durations[-1000:]


metrics_collector = MetricsCollector()


def generate_prometheus_metrics(db: Session) -> str:
    lines = []
    lines.append('# HELP ticket_system_info System information')
    lines.append('# TYPE ticket_system_info gauge')
    lines.append(f'ticket_system_info{{version="1.0.0",python="{platform.python_version()}",os="{platform.system()}",host="{platform.node()}"}} 1')

    lines.append('# HELP ticket_system_uptime_seconds Uptime in seconds')
    lines.append('# TYPE ticket_system_uptime_seconds gauge')
    lines.append(f'ticket_system_uptime_seconds {int(time.time() - PROCESS_START)}')

    lines.append('# HELP ticket_system_requests_total Total requests by method')
    lines.append('# TYPE ticket_system_requests_total counter')
    for method in METHODS:
        lines.append(f'ticket_system_requests_total{{method="{method}"}} {metrics_collector.counts.get(method, 0)}')

    lines.append('# HELP ticket_system_errors_total Total errors')
    lines.append('# TYPE ticket_system_errors_total counter')
    lines.append(f'ticket_system_errors_total {metrics_collector.errors}')

    if request_durations:
        avg_ms = sum(request_durations) / len(request_durations)
        lines.append('# HELP ticket_system_request_duration_ms Average request duration')
        lines.append('# TYPE ticket_system_request_duration_ms gauge')
        lines.append(f'ticket_system_request_duration_ms {avg_ms:.2f}')

    total = db.query(func.count(Ticket.id)).scalar() or 0
    lines.append('# HELP ticket_system_tickets_total Total tickets')
    lines.append('# TYPE ticket_system_tickets_total gauge')
    lines.append(f'ticket_system_tickets_total {total}')

    for s in ('new', 'in_progress', 'completed', 'closed', 'on_hold'):
        cnt = db.query(func.count(Ticket.id)).filter(Ticket.status == s).scalar() or 0
        lines.append(f'ticket_system_tickets{{status="{s}"}} {cnt}')

    for p in ('critical', 'high', 'medium', 'low'):
        cnt = db.query(func.count(Ticket.id)).filter(Ticket.priority == p).scalar() or 0
        lines.append(f'ticket_system_tickets_by_priority{{priority="{p}"}} {cnt}')

    active_warranty = db.query(func.count(Ticket.id)).filter(
        Ticket.warranty_months > 0, Ticket.warranty_end_date >= date.today()
    ).scalar() or 0
    lines.append(f'ticket_system_warranty_active {active_warranty}')

    pending_wc = db.query(func.count(WarrantyChecklist.id)).filter(
        WarrantyChecklist.status == "pending", WarrantyChecklist.check_date <= date.today()
    ).scalar() or 0
    lines.append(f'ticket_system_warranty_overdue {pending_wc}')

    lines.append('# HELP ticket_system_tasks_total Total tasks')
    lines.append('# TYPE ticket_system_tasks_total gauge')
    lines.append(f'ticket_system_tasks_total {db.query(func.count(Task.id)).scalar() or 0}')

    overdue_tasks = db.query(func.count(Task.id)).filter(
        Task.due_date < date.today(), Task.status != "completed"
    ).scalar() or 0
    lines.append(f'ticket_system_tasks_overdue {overdue_tasks}')

    eq_cnt = db.query(func.count(Equipment.id)).scalar() or 0
    lines.append(f'ticket_system_equipment_total {eq_cnt}')

    lines.append('# HELP ticket_system_db_size_bytes Database file size')
    lines.append('# TYPE ticket_system_db_size_bytes gauge')
    db_path = os.getenv("DATABASE_URL", "").replace("sqlite:///", "")
    if db_path:
        try:
            sz = os.path.getsize(db_path)
            lines.append(f'ticket_system_db_size_bytes {sz}')
        except: pass

    lines.append('# HELP ticket_system_memory_rss_bytes Process memory usage')
    lines.append('# TYPE ticket_system_memory_rss_bytes gauge')
    try:
        proc = psutil.Process()
        lines.append(f'ticket_system_memory_rss_bytes {proc.memory_info().rss}')
    except: pass

    return '\n'.join(lines)


def generate_analytics(db: Session) -> dict:
    today = date.today()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)

    tickets_total = db.query(func.count(Ticket.id)).scalar() or 0
    tickets_week = db.query(func.count(Ticket.id)).filter(Ticket.created_at >= week_ago).scalar() or 0
    tickets_month = db.query(func.count(Ticket.id)).filter(Ticket.created_at >= month_ago).scalar() or 0

    tasks_total = db.query(func.count(Task.id)).scalar() or 0
    tasks_done_week = db.query(func.count(Task.id)).filter(
        Task.completed_at >= week_ago, Task.status == "completed"
    ).scalar() or 0

    equipment_total = db.query(func.count(Equipment.id)).scalar() or 0
    maintenance_week = db.query(func.count(EquipmentMaintenance.id)).filter(
        EquipmentMaintenance.work_date >= week_ago
    ).scalar() or 0

    warranty_active = db.query(func.count(Ticket.id)).filter(
        Ticket.warranty_months > 0, Ticket.warranty_end_date >= today
    ).scalar() or 0
    warranty_expiring = db.query(func.count(Ticket.id)).filter(
        Ticket.warranty_end_date.between(today, today + timedelta(days=30))
    ).scalar() or 0

    checks_pending = db.query(func.count(WarrantyChecklist.id)).filter(
        WarrantyChecklist.status == "pending", WarrantyChecklist.check_date <= today
    ).scalar() or 0

    # Status distribution
    status_dist = {}
    for s in ('new', 'in_progress', 'completed', 'closed', 'on_hold'):
        cnt = db.query(func.count(Ticket.id)).filter(Ticket.status == s).scalar() or 0
        status_dist[s] = cnt

    # Tasks by day (last 7 days)
    tasks_by_day = []
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        cnt = db.query(func.count(Task.id)).filter(
            func.date(Task.completed_at) == d, Task.status == "completed"
        ).scalar() or 0
        tasks_by_day.append({"date": str(d), "completed": cnt})

    # Tickets by day (last 30 days)
    tickets_by_day = []
    for i in range(29, -1, -1):
        d = today - timedelta(days=i)
        cnt = db.query(func.count(Ticket.id)).filter(func.date(Ticket.created_at) == d).scalar() or 0
        tickets_by_day.append({"date": str(d), "count": cnt})

    # Top clients
    top_clients = db.query(
        Client.name, func.count(Ticket.id).label('cnt')
    ).join(Ticket, Client.id == Ticket.client_id, isouter=True
    ).group_by(Client.id, Client.name).order_by(func.count(Ticket.id).desc()).limit(10).all()

    return {
        "period": {"today": str(today), "week_ago": str(week_ago), "month_ago": str(month_ago)},
        "tickets": {"total": tickets_total, "week": tickets_week, "month": tickets_month, "by_status": status_dist},
        "tasks": {"total": tasks_total, "completed_week": tasks_done_week},
        "equipment": {"total": equipment_total, "maintenance_week": maintenance_week},
        "warranty": {"active": warranty_active, "expiring_30d": warranty_expiring, "checks_overdue": checks_pending},
        "tasks_by_day": tasks_by_day,
        "tickets_by_day": tickets_by_day,
        "top_clients": [{"name": c[0], "tickets": c[1]} for c in top_clients if c[0]],
    }
