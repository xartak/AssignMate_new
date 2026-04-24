from vkbottle import Keyboard, KeyboardButtonColor, Text

from utils.formatters import truncate_text


def lessons_keyboard(course_id: int, lessons, page: int, has_prev: bool, has_next: bool) -> str:
    """
    Inline-клавиатура со списком уроков курса.
    lessons — список Lesson-dataclasses.
    """
    kb = Keyboard(one_time=False, inline=True)
    for idx, lesson in enumerate(lessons):
        title = truncate_text(f"{lesson.order}. {lesson.title}", 40)
        kb.add(
            Text(title, payload={"a": "lesson", "c": course_id, "o": lesson.order}),
            color=KeyboardButtonColor.PRIMARY,
        )
        if (idx + 1) % 2 == 0 and idx < len(lessons) - 1:
            kb.row()

    if has_prev or has_next:
        kb.row()
        if has_prev:
            kb.add(
                Text(
                    "◀",
                    payload={"a": "page", "e": "lessons", "c": course_id, "p": page - 1},
                ),
                color=KeyboardButtonColor.SECONDARY,
            )
        if has_next:
            kb.add(
                Text(
                    "▶",
                    payload={"a": "page", "e": "lessons", "c": course_id, "p": page + 1},
                ),
                color=KeyboardButtonColor.SECONDARY,
            )

    kb.row()
    kb.add(
        Text("⬅ К курсам", payload={"a": "back", "to": "courses"}),
        color=KeyboardButtonColor.SECONDARY,
    )
    return kb.get_json()


def homeworks_keyboard(
    course_id: int,
    lesson_order: int,
    homeworks,
    page: int,
    has_prev: bool,
    has_next: bool,
) -> str:
    kb = Keyboard(one_time=False, inline=True)
    for idx, hw in enumerate(homeworks):
        label = truncate_text(f"{hw.order}. {hw.title}", 40)
        kb.add(
            Text(
                label,
                payload={
                    "a": "homework",
                    "c": course_id,
                    "l": lesson_order,
                    "o": hw.order,
                },
            ),
            color=KeyboardButtonColor.PRIMARY,
        )
        if (idx + 1) % 2 == 0 and idx < len(homeworks) - 1:
            kb.row()

    if has_prev or has_next:
        kb.row()
        if has_prev:
            kb.add(
                Text(
                    "◀",
                    payload={
                        "a": "page",
                        "e": "homeworks",
                        "c": course_id,
                        "l": lesson_order,
                        "p": page - 1,
                    },
                ),
                color=KeyboardButtonColor.SECONDARY,
            )
        if has_next:
            kb.add(
                Text(
                    "▶",
                    payload={
                        "a": "page",
                        "e": "homeworks",
                        "c": course_id,
                        "l": lesson_order,
                        "p": page + 1,
                    },
                ),
                color=KeyboardButtonColor.SECONDARY,
            )

    kb.row()
    kb.add(
        Text("⬅ К урокам", payload={"a": "back", "to": "lessons", "c": course_id}),
        color=KeyboardButtonColor.SECONDARY,
    )
    return kb.get_json()


def homework_detail_keyboard(course_id: int, lesson_order: int) -> str:
    kb = Keyboard(one_time=False, inline=True)
    kb.add(
        Text(
            "⬅ К заданиям",
            payload={"a": "back", "to": "homeworks", "c": course_id, "l": lesson_order},
        ),
        color=KeyboardButtonColor.PRIMARY,
    )
    kb.row()
    kb.add(
        Text(
            "⬅ К урокам",
            payload={"a": "back", "to": "lessons", "c": course_id},
        ),
        color=KeyboardButtonColor.SECONDARY,
    )
    kb.add(
        Text("🏠 Меню", payload={"a": "menu"}),
        color=KeyboardButtonColor.SECONDARY,
    )
    return kb.get_json()


def courses_navigation_keyboard(page: int, has_prev: bool, has_next: bool) -> str:
    """Навигация под carousel курсов (когда VK не поддерживает пагинацию внутри)."""
    kb = Keyboard(one_time=False, inline=False)
    if has_prev:
        kb.add(
            Text("◀ Назад", payload={"a": "page", "e": "courses", "p": page - 1}),
            color=KeyboardButtonColor.SECONDARY,
        )
    if has_next:
        kb.add(
            Text("Вперёд ▶", payload={"a": "page", "e": "courses", "p": page + 1}),
            color=KeyboardButtonColor.SECONDARY,
        )
    kb.row()
    kb.add(
        Text("🏠 Главное меню", payload={"a": "menu"}),
        color=KeyboardButtonColor.PRIMARY,
    )
    return kb.get_json()
