from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, Float, Boolean, ForeignKey, Date, BigInteger
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from .database import Base


class PriorityEnum(str, enum.Enum):
    critical = "critical"
    high = "high"
    medium = "medium"
    low = "low"


class StatusEnum(str, enum.Enum):
    new = "new"
    in_progress = "in_progress"
    completed = "completed"
    closed = "closed"
    on_hold = "on_hold"


class ClientTypeEnum(str, enum.Enum):
    individual = "individual"
    legal = "legal"


class EquipmentTypeEnum(str, enum.Enum):
    printer = "printer"
    kkt = "kkt"
    svn = "svn"
    other = "other"


class EquipmentStatusEnum(str, enum.Enum):
    active = "active"
    inactive = "inactive"
    broken = "broken"
    written_off = "written_off"


# ===================== Existing Models (enhanced) =====================

class Client(Base):
    __tablename__ = "clients"
    id = Column(Integer, primary_key=True, index=True)
    client_type = Column(Enum(ClientTypeEnum), nullable=False)
    name = Column(String(300), nullable=False)
    phone = Column(String(30))
    email = Column(String(150))
    address = Column(Text)
    inn = Column(String(12))
    kpp = Column(String(9))
    contact_person = Column(String(300))
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    tickets = relationship("Ticket", back_populates="client")
    equipment = relationship("Equipment", back_populates="client")


class Ticket(Base):
    __tablename__ = "tickets"
    id = Column(Integer, primary_key=True, index=True)
    number = Column(String(30), unique=True, index=True, nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"))
    client = relationship("Client", back_populates="tickets")
    short_description = Column(String(500))
    full_description = Column(Text)
    priority = Column(Enum(PriorityEnum), default=PriorityEnum.medium)
    status = Column(Enum(StatusEnum), default=StatusEnum.new)
    work_date = Column(Date, nullable=True)
    review_date = Column(Date, nullable=True)
    warranty_months = Column(Integer, default=0)
    warranty_end_date = Column(Date, nullable=True)
    equipment_id = Column(Integer, ForeignKey("equipment.id"), nullable=True)
    equipment = relationship("Equipment", back_populates="tickets")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    attachments = relationship("Attachment", back_populates="ticket", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="ticket", cascade="all, delete-orphan")
    history = relationship("TicketHistory", back_populates="ticket", cascade="all, delete-orphan", order_by="TicketHistory.created_at")
    services = relationship("TicketService", back_populates="ticket", cascade="all, delete-orphan")
    inspections = relationship("InspectionReport", back_populates="ticket", cascade="all, delete-orphan")
    warranty_checks = relationship("WarrantyChecklist", back_populates="ticket", cascade="all, delete-orphan")


class TicketService(Base):
    __tablename__ = "ticket_services"
    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=False)
    ticket = relationship("Ticket", back_populates="services")
    service_name = Column(String(300), nullable=False)
    description = Column(Text)
    quantity = Column(Integer, default=1)
    price = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    warranty_months = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


# ===================== Equipment Models =====================

class Equipment(Base):
    __tablename__ = "equipment"
    id = Column(Integer, primary_key=True, index=True)
    equipment_type = Column(String(100), nullable=False)
    manufacturer = Column(String(200))
    model = Column(String(200))
    serial_number = Column(String(200))
    inventory_number = Column(String(200))
    location = Column(Text)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    client = relationship("Client", back_populates="equipment")
    purchase_date = Column(Date, nullable=True)
    warranty_expiry = Column(Date, nullable=True)
    status = Column(String(30), default="active")
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    tickets = relationship("Ticket", back_populates="equipment")
    maintenance = relationship("EquipmentMaintenance", back_populates="equipment", cascade="all, delete-orphan")
    reminders = relationship("EquipmentReminder", back_populates="equipment", cascade="all, delete-orphan")


class EquipmentMaintenance(Base):
    __tablename__ = "equipment_maintenance"
    id = Column(Integer, primary_key=True, index=True)
    equipment_id = Column(Integer, ForeignKey("equipment.id"), nullable=False)
    equipment = relationship("Equipment", back_populates="maintenance")
    maintenance_type = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    replaced_parts = Column(Text)
    work_date = Column(Date, nullable=False)
    next_maintenance_date = Column(Date, nullable=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=True)
    cost = Column(Float, default=0.0)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


class EquipmentReminder(Base):
    __tablename__ = "equipment_reminders"
    id = Column(Integer, primary_key=True, index=True)
    equipment_id = Column(Integer, ForeignKey("equipment.id"), nullable=False)
    equipment = relationship("Equipment", back_populates="reminders")
    title = Column(String(300), nullable=False)
    description = Column(Text)
    reminder_date = Column(Date, nullable=False)
    repeat_interval = Column(String(50), nullable=True)
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


# ===================== Tasks Model =====================

class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(300), nullable=False)
    description = Column(Text)
    category = Column(String(100))
    priority = Column(String(20), default="medium")
    status = Column(String(30), default="pending")
    due_date = Column(Date, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ===================== Inspection Models =====================

class InspectionReport(Base):
    __tablename__ = "inspection_reports"
    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=False)
    ticket = relationship("Ticket", back_populates="inspections")
    report_date = Column(Date, nullable=False)
    report_type = Column(String(50), default="monthly")
    status = Column(String(30), default="pending")
    notes = Column(Text)
    client_confirmed = Column(Boolean, default=False)
    client_response = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    files = relationship("InspectionFile", back_populates="inspection", cascade="all, delete-orphan")


class InspectionFile(Base):
    __tablename__ = "inspection_files"
    id = Column(Integer, primary_key=True, index=True)
    inspection_id = Column(Integer, ForeignKey("inspection_reports.id"), nullable=False)
    inspection = relationship("InspectionReport", back_populates="files")
    filename = Column(String(300), nullable=False)
    filepath = Column(Text, nullable=False)
    file_type = Column(String(50))
    file_size = Column(BigInteger, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)


class WarrantyChecklist(Base):
    __tablename__ = "warranty_checklist"
    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=False)
    ticket = relationship("Ticket", back_populates="warranty_checks")
    check_date = Column(Date, nullable=False)
    month_number = Column(Integer, nullable=False)
    status = Column(String(30), default="pending")
    notes = Column(Text)
    files_attached = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=True)
    notification_type = Column(String(50), nullable=False)
    channel = Column(String(30))
    recipient = Column(String(200))
    title = Column(String(300))
    message = Column(Text)
    is_sent = Column(Boolean, default=False)
    sent_at = Column(DateTime, nullable=True)
    scheduled_for = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


# ===================== Report Templates =====================

class ReportTemplate(Base):
    __tablename__ = "report_templates"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(300), nullable=False)
    entity_type = Column(String(50), nullable=False)
    columns = Column(Text, nullable=False)
    filters = Column(Text, nullable=True)
    sort_by = Column(String(100), nullable=True)
    sort_order = Column(String(10), default="desc")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ===================== Existing models (keep as is) =====================

class Attachment(Base):
    __tablename__ = "attachments"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255))
    filepath = Column(String(500))
    mime_type = Column(String(100))
    file_size = Column(BigInteger, nullable=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"))
    ticket = relationship("Ticket", back_populates="attachments")


class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, index=True)
    doc_type = Column(String(50))
    number = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)
    ticket_id = Column(Integer, ForeignKey("tickets.id"))
    ticket = relationship("Ticket", back_populates="documents")
    total_amount = Column(Float, default=0.0)
    warranty_period = Column(String(100), nullable=True)
    items = relationship("DocumentItem", back_populates="document", cascade="all, delete-orphan")


class DocumentItem(Base):
    __tablename__ = "document_items"
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"))
    document = relationship("Document", back_populates="items")
    service_name = Column(String(200))
    quantity = Column(Integer, default=1)
    price = Column(Float, default=0.0)
    total = Column(Float, default=0.0)


class TicketHistory(Base):
    __tablename__ = "ticket_history"
    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"))
    ticket = relationship("Ticket", back_populates="history")
    action = Column(String(100))
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    user = Column(String(100))


class UserModel(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    password_hash = Column(String(256), nullable=False)
    role = Column(String(20), default="master")
    full_name = Column(String(100))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
