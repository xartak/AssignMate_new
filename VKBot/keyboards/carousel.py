import json

from utils.formatters import truncate_text


def _button_text(title: str, payload: dict) -> dict:
    return {
        "action": {
            "type": "text",
            "label": truncate_text(title, 40),
            "payload": json.dumps(payload, ensure_ascii=False),
        }
    }


def courses_carousel(courses) -> str:
    """
    VK-карусель со списком курсов. До 10 элементов на сообщение.
    Возвращает JSON-строку (передаётся в параметр `template` при message.send).

    Каждый элемент — карточка с title + description + кнопкой «Открыть».
    Без фото (photo_id опционален, добавляется позже если есть медиа-контент).
    """
    elements = []
    for course in courses[:10]:
        elements.append(
            {
                "title": truncate_text(course.title or "Курс", 80),
                "description": truncate_text(course.description or "", 80),
                "buttons": [
                    _button_text(
                        "Открыть курс",
                        {"a": "course", "id": course.id},
                    )
                ],
            }
        )

    template = {
        "type": "carousel",
        "elements": elements,
    }
    return json.dumps(template, ensure_ascii=False)
