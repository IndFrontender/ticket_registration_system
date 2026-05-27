import json
from typing import List, Optional, Any
from ..config import settings

DOC_INTENT_KEYWORDS = {
    "receipt": ["чек", "кассов", "оплат"],
    "warranty": ["гаранти", "талон", "гарантийн"],
    "invoice": ["платёж", "счёт", "платеж", "оплат"],
    "act": ["акт", "выполнен"],
}


def _detect_document_action(query: str) -> Optional[dict]:
    query_lower = query.lower()
    for doc_type, keywords in DOC_INTENT_KEYWORDS.items():
        if any(kw in query_lower for kw in keywords):
            return {"doc_type": doc_type, "step": 1, "total_steps": 2}
    return None


class AIAssistantService:

    SYSTEM_PROMPT = """Ты — дружелюбный AI-помощник системы регистрации заявок для системного администратора.
Твоя задача — помогать пользователям оформлять заявки, отвечать на вопросы о статусе,
давать советы по описанию проблемы, определять приоритет.

Ты общаешься приветливо, профессионально, кратко и по делу.
Отвечай на русском языке.
Если пользователь описывает проблему — помоги определить приоритет и корректно оформить заявку.

Ты можешь:
1. Помочь сформулировать описание проблемы
2. Подсказать, какой приоритет выбрать
3. Объяснить статусы заявок
4. Ответить на вопросы о работе системы
5. Подсказать контактные данные поддержки
6. Создать документы — если пользователь просит чек, гарантийный талон, платёжный документ или акт, предложи помощь"""

    @staticmethod
    async def get_response(query: str, context: Optional[str] = None) -> tuple[str, Optional[List[str]], Optional[dict]]:
        doc_action = _detect_document_action(query)

        if not settings.OPENAI_API_KEY:
            answer, actions = _rule_based_response(query, context)
            return answer, actions, doc_action

        try:
            import openai
            client = openai.AsyncClient(api_key=settings.OPENAI_API_KEY)

            messages = [{"role": "system", "content": AIAssistantService.SYSTEM_PROMPT}]
            if context:
                messages.append({"role": "system", "content": f"Контекст: {context}"})
            messages.append({"role": "user", "content": query})

            response = await client.chat.completions.create(
                model=settings.AI_MODEL,
                messages=messages,
                temperature=0.7,
                max_tokens=500
            )
            answer = response.choices[0].message.content

            suggested_actions = None
            try:
                completion = await client.chat.completions.create(
                    model=settings.AI_MODEL,
                    messages=messages + [
                        {"role": "assistant", "content": answer},
                        {"role": "user", "content": "Какие действия ты рекомендуешь предпринять пользователю? Ответь в формате JSON-массива строк."}
                    ],
                    temperature=0.3,
                    max_tokens=200
                )
                suggestions = completion.choices[0].message.content
                suggested_actions = json.loads(suggestions)
            except Exception:
                pass

            return answer, suggested_actions, doc_action

        except Exception as e:
            return f"⚠️ Ошибка AI: {str(e)}. Использую локальный режим.", None, doc_action


def _rule_based_response(query: str, context: Optional[str] = None) -> tuple[str, Optional[List[str]]]:
    query_lower = query.lower()

    responses = {
        "приоритет": {
            "answer": "Приоритеты заявок:\n🔴 Критический — авария, отказ системы\n🟠 Высокий — серьёзная проблема\n🟡 Средний — вопрос, улучшение\n🟢 Низкий — консультация, пожелание",
            "actions": ["Выбрать приоритет", "Создать заявку"]
        },
        "статус": {
            "answer": "Статусы заявок:\n🆕 Новая — заявка создана\n🔧 В работе — проблема решается\n✅ Выполнена — работа сделана\n🔒 Закрыта — заявка завершена",
            "actions": ["Проверить статус заявки", "Фильтр по статусу"]
        },
        "созда": {
            "answer": "Для создания заявки напишите:\n1️⃣ Ваше ФИО или название организации\n2️⃣ Адрес, телефон, email\n3️⃣ Кратко опишите проблему\n4️⃣ Приложите скриншоты (если есть)\n\nЯ помогу сформулировать!",
            "actions": ["Создать заявку", "Задать вопрос"]
        },
        "спасиб": {
            "answer": "Рад помочь! 😊 Если понадобится что-то ещё — обращайтесь.",
            "actions": None
        },
        "привет": {
            "answer": "Здравствуйте! 👋 Я AI-помощник системы заявок. Чем могу помочь?",
            "actions": ["Создать заявку", "Узнать статус", "Задать вопрос"]
        },
        "здравств": {
            "answer": "Здравствуйте! 👋 Я AI-помощник системы заявок. Чем могу помочь?",
            "actions": ["Создать заявку", "Узнать статус", "Задать вопрос"]
        },
        "помощ": {
            "answer": "Я могу помочь:\n📝 Создать заявку\n📊 Проверить статус\n📄 Сформировать документы\n❓ Ответить на вопросы",
            "actions": ["Создать заявку", "Узнать статус"]
        },
    }

    for key, value in responses.items():
        if key in query_lower:
            return value["answer"], value["actions"]

    # Check document intent
    for doc_type, keywords in DOC_INTENT_KEYWORDS.items():
        if any(kw in query_lower for kw in keywords):
            labels = {"receipt": "чека", "warranty": "гарантийного талона", "invoice": "платёжного документа", "act": "акта"}
            return f"Конечно! Я помогу сформировать {labels.get(doc_type, 'документа')}.\n\nВыберите заявку, для которой нужно создать документ, и я помогу заполнить все поля.", ["Создать документ"]

    return "Опишите ваш вопрос подробнее, и я постараюсь помочь! 😊", None
