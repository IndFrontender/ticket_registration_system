from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Ticket, UserModel
from ..schemas import AIAssistantQuery, AIAssistantResponse, DocumentAction, DocumentActionField
from ..services.ai_assistant_service import AIAssistantService
from .auth import get_current_user

router = APIRouter(prefix="/api/ai", tags=["ai_assistant"])

DOC_TYPE_LABELS = {
    "receipt": "Кассовый чек",
    "warranty": "Гарантийный талон",
    "invoice": "Платёжный документ",
    "act": "Акт выполненных работ",
}

DOC_TYPE_STEPS = {
    "receipt": [
        {
            "fields": [
                {"key": "total_amount", "label": "Общая сумма (руб.)", "type": "number", "required": True, "placeholder": "0.00"},
                {"key": "items", "label": "Услуги (название через запятую)", "type": "text", "required": False, "placeholder": "Ремонт ПК, замена БП"},
            ],
        },
        {
            "fields": [
                {"key": "quantities", "label": "Количество (через запятую)", "type": "text", "required": False, "placeholder": "1, 1"},
                {"key": "prices", "label": "Цены (через запятую)", "type": "text", "required": False, "placeholder": "5000, 2500"},
            ],
        },
    ],
    "warranty": [
        {
            "fields": [
                {"key": "warranty_period", "label": "Срок гарантии", "type": "text", "required": True, "placeholder": "6 месяцев"},
                {"key": "items", "label": "Услуги (название через запятую)", "type": "text", "required": False, "placeholder": "Диагностика, ремонт"},
            ],
        },
        {
            "fields": [
                {"key": "total_amount", "label": "Сумма (руб.)", "type": "number", "required": False, "placeholder": "0.00"},
            ],
        },
    ],
    "invoice": [
        {
            "fields": [
                {"key": "total_amount", "label": "Сумма к оплате (руб.)", "type": "number", "required": True, "placeholder": "0.00"},
                {"key": "items", "label": "Наименование услуг", "type": "text", "required": True, "placeholder": "Консультация, настройка"},
            ],
        },
        {
            "fields": [
                {"key": "quantities", "label": "Количество (через запятую)", "type": "text", "required": False, "placeholder": "1, 2"},
                {"key": "prices", "label": "Цены (через запятую)", "type": "text", "required": False, "placeholder": "3000, 1500"},
            ],
        },
    ],
    "act": [
        {
            "fields": [
                {"key": "total_amount", "label": "Сумма (руб.)", "type": "number", "required": True, "placeholder": "0.00"},
                {"key": "items", "label": "Выполненные работы", "type": "text", "required": True, "placeholder": "Ремонт принтера, замена картриджа"},
            ],
        },
        {
            "fields": [
                {"key": "quantities", "label": "Количество (через запятую)", "type": "text", "required": False, "placeholder": "1, 1"},
                {"key": "prices", "label": "Цены (через запятую)", "type": "text", "required": False, "placeholder": "2000, 3500"},
            ],
        },
    ],
}


@router.post("/chat", response_model=AIAssistantResponse)
async def chat_with_ai(
    data: AIAssistantQuery,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    if not data.query.strip():
        raise HTTPException(400, "Запрос не может быть пустым")

    answer, suggested_actions, doc_action = await AIAssistantService.get_response(data.query, data.context)

    document_action = None
    if doc_action:
        doc_type = doc_action.get("doc_type")
        step = doc_action.get("step", 1)
        if doc_type in DOC_TYPE_STEPS:
            tickets = db.query(Ticket).order_by(Ticket.created_at.desc()).limit(20).all()
            step_def = DOC_TYPE_STEPS[doc_type][step - 1]
            fields = [DocumentActionField(**f) for f in step_def["fields"]]
            if step == 1:
                fields.insert(0, DocumentActionField(
                    key="ticket_id", label="Заявка", type="select",
                    required=True, options=[f"{t.id}: #{t.number} — {t.short_description or ''}" for t in tickets],
                    placeholder="Выберите заявку",
                ))
            document_action = DocumentAction(
                doc_type=doc_type,
                step=step,
                total_steps=len(DOC_TYPE_STEPS[doc_type]),
                fields=fields,
            )

    return AIAssistantResponse(
        answer=answer,
        suggested_actions=suggested_actions,
        document_action=document_action,
    )
