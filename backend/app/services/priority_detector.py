import re
from ..models import PriorityEnum


CRITICAL_KEYWORDS = [
    "авария", "пожар", "критический", "не работает система", "отказ",
    "взлом", "вирус", "утечка", "катастрофа", "простой производства",
    "срочно", "аварийный", "не работает сервер", "падение", "crash",
    "emergency", "critical", "down", "outage", "data loss"
]

HIGH_KEYWORDS = [
    "высокий", "важный", "проблема", "ошибка", "не работает", "баг",
    "зависание", "медленно", "не загружается", "не открывается",
    "high", "urgent", "important", "error", "bug", "slow", "not working"
]

MEDIUM_KEYWORDS = [
    "средний", "улучшение", "пожелание", "вопрос", "консультация",
    "помощь", "не удобно", "хотелось бы", "можно",
    "medium", "question", "help", "improvement", "suggestion"
]


def detect_priority(text: str) -> PriorityEnum:
    if not text:
        return PriorityEnum.medium

    text_lower = text.lower()

    for kw in CRITICAL_KEYWORDS:
        if re.search(re.escape(kw.lower()), text_lower):
            return PriorityEnum.critical

    for kw in HIGH_KEYWORDS:
        if re.search(re.escape(kw.lower()), text_lower):
            return PriorityEnum.high

    for kw in MEDIUM_KEYWORDS:
        if re.search(re.escape(kw.lower()), text_lower):
            return PriorityEnum.medium

    return PriorityEnum.low
