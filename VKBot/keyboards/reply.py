import json

from vkbottle import Keyboard, KeyboardButtonColor, Text


def main_keyboard() -> str:
    """
    Главное меню бота. Reply-кнопки (не inline).
    VK поддерживает цвета: POSITIVE (зелёный), NEGATIVE (красный),
    PRIMARY (синий), SECONDARY (серый).
    """
    kb = Keyboard(one_time=False, inline=False)
    kb.add(
        Text("📚 Курсы", payload={"a": "courses"}),
        color=KeyboardButtonColor.POSITIVE,
    )
    kb.row()
    kb.add(
        Text("👤 Профиль", payload={"a": "profile"}),
        color=KeyboardButtonColor.PRIMARY,
    )
    kb.add(
        Text("❓ Помощь", payload={"a": "help"}),
        color=KeyboardButtonColor.SECONDARY,
    )
    return kb.get_json()


def link_hint_keyboard() -> str:
    """Пустая reply-клавиатура с подсказкой ввода кода."""
    kb = Keyboard(one_time=False, inline=False)
    kb.add(
        Text("❓ Помощь", payload={"a": "help"}),
        color=KeyboardButtonColor.SECONDARY,
    )
    return kb.get_json()


def paginator_keyboard(entity: str, page: int, has_prev: bool, has_next: bool, **extra) -> str:
    """
    Клавиатура пагинации для списков.
    entity: 'courses' / 'lessons' / 'homeworks'.
    extra: параметры контекста (course_id, lesson_order) кладутся в payload.
    """
    kb = Keyboard(one_time=False, inline=False)
    added = False
    if has_prev:
        payload = {"a": "page", "e": entity, "p": page - 1, **extra}
        kb.add(Text("◀ Назад", payload=payload), color=KeyboardButtonColor.SECONDARY)
        added = True
    if has_next:
        payload = {"a": "page", "e": entity, "p": page + 1, **extra}
        kb.add(Text("Вперёд ▶", payload=payload), color=KeyboardButtonColor.SECONDARY)
        added = True
    if not added:
        return main_keyboard()
    kb.row()
    kb.add(
        Text("🏠 Главное меню", payload={"a": "menu"}),
        color=KeyboardButtonColor.PRIMARY,
    )
    return kb.get_json()


def ensure_payload(raw) -> dict:
    """VK может прислать payload как str или dict — нормализуем."""
    if not raw:
        return {}
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        try:
            return json.loads(raw)
        except (ValueError, TypeError):
            return {}
    return {}
