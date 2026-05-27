from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from .models import PriorityEnum, StatusEnum, ClientTypeEnum


class ClientCreate(BaseModel):
    client_type: ClientTypeEnum
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    inn: Optional[str] = None
    kpp: Optional[str] = None


class ClientResponse(ClientCreate):
    id: int

    class Config:
        from_attributes = True


class AttachmentResponse(BaseModel):
    id: int
    filename: str
    filepath: str
    mime_type: str

    class Config:
        from_attributes = True


class DocumentItemCreate(BaseModel):
    service_name: str
    quantity: int = 1
    price: float = 0.0
    total: float = 0.0


class DocumentItemResponse(DocumentItemCreate):
    id: int

    class Config:
        from_attributes = True


class DocumentCreate(BaseModel):
    doc_type: str
    total_amount: float = 0.0
    warranty_period: Optional[str] = None
    items: List[DocumentItemCreate] = []


class DocumentResponse(BaseModel):
    id: int
    doc_type: str
    number: str
    created_at: datetime
    ticket_id: int
    total_amount: float
    warranty_period: Optional[str] = None
    items: List[DocumentItemResponse] = []

    class Config:
        from_attributes = True


class TicketCreate(BaseModel):
    client_id: Optional[int] = None
    client: Optional[ClientCreate] = None
    short_description: str
    full_description: Optional[str] = None
    priority: Optional[PriorityEnum] = None
    deadline: Optional[datetime] = None
    work_date: Optional[datetime] = None
    review_date: Optional[datetime] = None
    warranty_months: Optional[int] = None


class TicketUpdate(BaseModel):
    status: Optional[StatusEnum] = None
    priority: Optional[PriorityEnum] = None
    short_description: Optional[str] = None
    full_description: Optional[str] = None
    deadline: Optional[datetime] = None
    work_date: Optional[datetime] = None
    review_date: Optional[datetime] = None
    warranty_months: Optional[int] = None


class TicketHistoryResponse(BaseModel):
    id: int
    action: str
    description: Optional[str]
    created_at: datetime
    user: str

    class Config:
        from_attributes = True


class TicketResponse(BaseModel):
    id: int
    number: str
    created_at: datetime
    updated_at: datetime
    status: StatusEnum
    priority: PriorityEnum
    deadline: Optional[datetime] = None
    client: Optional[ClientResponse] = None
    short_description: str
    full_description: Optional[str] = None
    attachments: List[AttachmentResponse] = []
    documents: List[DocumentResponse] = []
    history: List[TicketHistoryResponse] = []

    class Config:
        from_attributes = True


class TicketListItem(BaseModel):
    id: int
    number: str
    created_at: datetime
    updated_at: datetime
    status: StatusEnum
    priority: PriorityEnum
    deadline: Optional[datetime] = None
    client_name: Optional[str] = None
    short_description: str

    class Config:
        from_attributes = True


class TicketFilterParams(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    search: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    sort_by: Optional[str] = "created_at"
    sort_order: Optional[str] = "desc"
    page: int = 1
    page_size: int = 20


class NotificationRequest(BaseModel):
    ticket_id: int
    channel: str
    message: Optional[str] = None


class DocumentActionField(BaseModel):
    key: str
    label: str
    type: str = "text"
    required: bool = False
    options: Optional[list[str]] = None
    placeholder: Optional[str] = None


class DocumentAction(BaseModel):
    doc_type: str
    step: int = 1
    total_steps: int = 2
    fields: list[DocumentActionField] = []
    ticket_id: Optional[int] = None


class AIAssistantQuery(BaseModel):
    query: str
    context: Optional[str] = None


class AIAssistantResponse(BaseModel):
    answer: str
    suggested_actions: Optional[List[str]] = None
    document_action: Optional[DocumentAction] = None
