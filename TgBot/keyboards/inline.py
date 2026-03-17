from aiogram.types import InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder
from typing import Optional

from utils.formatters import truncate_text


class PaginationKeyboard:
    @staticmethod
    def create(
        current_page: int,
        total_pages: int,
        next_url: Optional[str],
        prev_url: Optional[str]
    ) -> InlineKeyboardMarkup:
        """
        Создает клавиатуру для пагинации

        Args:
            current_page: текущая страница
            total_pages: всего страниц
            next_url: URL следующей страницы
            prev_url: URL предыдущей страницы
        """
        builder = InlineKeyboardBuilder()

        # Кнопки навигации
        if prev_url:
            builder.button(
                text="◀️ Предыдущая",
                callback_data=f"page:{current_page - 1}:{next_url}:{prev_url}"
            )

        # Информация о странице
        builder.button(
            text=f"📄 {current_page}/{total_pages}",
            callback_data="current_page_info"
        )

        if next_url:
            builder.button(
                text="Следующая ▶️",
                callback_data=f"page:{current_page + 1}:{next_url}:{prev_url}"
            )

        # Кнопка обновления
        builder.button(
            text="🔄 Обновить",
            callback_data="refresh_courses",
        )

        # Располагаем кнопки
        if prev_url and next_url:
            builder.adjust(1, 2, 1)  # info на отдельной строке
        else:
            builder.adjust(2, 1, 1)  # если только одна стрелка

        return builder.as_markup()


def courses_keyboard(
    courses: list,
    page: int,
    has_prev: bool,
    has_next: bool,
) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()

    for course in courses:
        builder.button(
            text=truncate_text(course.title, max_length=48),
            callback_data=f"course:{course.id}",
        )

    if has_prev:
        builder.button(
            text="◀️ Предыдущая страница",
            callback_data=f"courses_page:{page - 1}",
        )
    if has_next:
        builder.button(
            text="Следующая страница ▶️",
            callback_data=f"courses_page:{page + 1}",
        )

    rows = [1] * len(courses)
    if has_prev and has_next:
        rows.append(2)
    elif has_prev or has_next:
        rows.append(1)
    if rows:
        builder.adjust(*rows)

    return builder.as_markup()


def lessons_keyboard(
    course_id: int,
    lessons: list,
    page: int,
    has_prev: bool,
    has_next: bool,
) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()

    for lesson in lessons:
        title = truncate_text(lesson.title, max_length=44)
        builder.button(
            text=f"{lesson.order}. {title}",
            callback_data=f"lesson:{course_id}:{lesson.order}",
        )

    if has_prev:
        builder.button(
            text="◀️ Предыдущие уроки",
            callback_data=f"lessons_page:{course_id}:{page - 1}",
        )
    if has_next:
        builder.button(
            text="Следующие уроки ▶️",
            callback_data=f"lessons_page:{course_id}:{page + 1}",
        )

    builder.button(
        text="⬅️ К курсам",
        callback_data="back:courses",
    )

    rows = [1] * len(lessons)
    if has_prev and has_next:
        rows.append(2)
    elif has_prev or has_next:
        rows.append(1)
    rows.append(1)
    builder.adjust(*rows)

    return builder.as_markup()


def homeworks_keyboard(
    course_id: int,
    lesson_order: int,
    homeworks: list,
    page: int,
    has_prev: bool,
    has_next: bool,
) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()

    for homework in homeworks:
        title = truncate_text(homework.title, max_length=44)
        builder.button(
            text=f"{homework.order}. {title}",
            callback_data=f"homework:{course_id}:{lesson_order}:{homework.order}",
        )

    if has_prev:
        builder.button(
            text="◀️ Предыдущие задания",
            callback_data=f"homeworks_page:{course_id}:{lesson_order}:{page - 1}",
        )
    if has_next:
        builder.button(
            text="Следующие задания ▶️",
            callback_data=f"homeworks_page:{course_id}:{lesson_order}:{page + 1}",
        )

    builder.button(
        text="⬅️ К урокам",
        callback_data=f"back:lessons:{course_id}",
    )

    rows = [1] * len(homeworks)
    if has_prev and has_next:
        rows.append(2)
    elif has_prev or has_next:
        rows.append(1)
    rows.append(1)
    builder.adjust(*rows)

    return builder.as_markup()


def homework_detail_keyboard(
    course_id: int,
    lesson_order: int,
) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(
        text="⬅️ К заданиям",
        callback_data=f"back:homeworks:{course_id}:{lesson_order}",
    )
    builder.button(
        text="⬅️ К урокам",
        callback_data=f"back:lessons:{course_id}",
    )
    builder.button(
        text="⬅️ К курсам",
        callback_data="back:courses",
    )
    builder.adjust(1, 1, 1)
    return builder.as_markup()
