def truncate_text(
    text: str,
    max_length: int = 100,
    suffix: str = "...",
) -> str:
    """Обрезает текст до указанной длины"""
    if len(text) <= max_length:
        return text
    return text[:max_length - len(suffix)] + suffix


def escape_markdown(text: str) -> str:
    if not text:
        return ""
    return (
        text.replace("\\", "\\\\")
        .replace("`", "\\`")
        .replace("*", "\\*")
        .replace("_", "\\_")
    )


def format_list_with_emoji(
    items: list,
    emoji: str = "•",
) -> str:
    """Форматирует список с emoji маркерами"""
    return "\n".join(f"{emoji} {item}" for item in items)


def format_course_message(
    courses: list,
    page: int = 1,
    total_pages: int = 1,
) -> str:
    """
    Форматирует список курсов для красивого отображения в Telegram
    """

    # Используем emoji для лучшей визуализации
    status_emoji = "✅"  # Можно добавить логику статуса

    message = f"📚 **Доступные курсы**\n"
    message += f"┌ {'─' * 30}\n"

    for i, course in enumerate(courses, 1):
        # Обрезаем длинное описание
        desc = course.description
        if desc and len(desc) > 50:
            desc = desc[:47] + "..."

        message += f"│ **{i}.** {status_emoji} **{course.title}**\n"
        if desc:
            message += f"│    _{desc}_\n"
        message += f"│    `ID: {course.id}`\n"
        message += f"├─{'─' * 28}\n"

    message += f"└───\n"
    message += f"📊 **Всего курсов:** {len(courses)}"

    # Добавляем информацию о пагинации
    if total_pages > 1:
        message += f"\n📑 Страница {page} из {total_pages}"

    return message


def format_empty_courses() -> str:
    """Форматирует сообщение, когда курсов нет"""
    return (
        "📭 **Курсы не найдены**\n\n"
        "На данный момент у вас нет доступных курсов.\n"
        "Возможные причины:\n"
        "• Вы еще не записались ни на один курс\n"
        "• Курсы находятся в разработке\n"
        "• Технические проблемы\n\n"
        "🔄 Попробуйте позже или обратитесь в поддержку."
    )


ASSIGNMENT_TYPE_LABELS = {
    "SINGLE_CHOICE": "Один вариант",
    "MULTIPLE_CHOICE": "Несколько вариантов",
    "FILL_BLANK": "Заполнить пропуски",
    "SHORT_ANSWER": "Краткий ответ",
    "LONG_ANSWER": "Развернутый ответ",
}


def format_courses_header(
    page: int,
    has_next: bool,
) -> str:
    message = "📚 **Доступные курсы**\nВыберите курс из списка ниже."
    if page > 1 or has_next:
        message += f"\n\nСтраница: {page}"
    return message


def format_lessons_header(
    course_title: str,
    page: int,
    has_next: bool,
) -> str:
    course_title = escape_markdown(course_title or "Курс")
    message = f"📘 **{course_title}**\nВыберите урок."
    if page > 1 or has_next:
        message += f"\n\nСтраница: {page}"
    return message


def format_homeworks_header(
    course_title: str,
    lesson_title: str,
    lesson_order: int,
    page: int,
    has_next: bool,
) -> str:
    course_title = escape_markdown(course_title or "Курс")
    lesson_title = escape_markdown(lesson_title or f"Урок {lesson_order}")
    message = (
        f"📗 **{course_title}**\n"
        f"Урок {lesson_order}: **{lesson_title}**\n"
        "Выберите задание."
    )
    if page > 1 or has_next:
        message += f"\n\nСтраница: {page}"
    return message


def _format_homework_details(
    homework_type: str,
    details: dict | None,
) -> list[str]:
    if not details:
        return []

    lines: list[str] = []

    if homework_type in {"SINGLE_CHOICE", "MULTIPLE_CHOICE"}:
        options = details.get("options") or []
        if options:
            option_lines = [
                f"- {truncate_text(escape_markdown(option.get('text', '')), max_length=80)}"
                for option in options
                if isinstance(option, dict)
            ]
            if option_lines:
                lines.append("Варианты ответа:")
                lines.extend(option_lines)
        if "shuffle_options" in details:
            shuffle = "да" if details.get("shuffle_options") else "нет"
            lines.append(f"Перемешивание вариантов: {shuffle}")
        return lines

    if homework_type == "FILL_BLANK":
        template = details.get("text_template")
        if template:
            lines.append("Шаблон:")
            lines.append(truncate_text(escape_markdown(template), max_length=300))
        blanks = details.get("blanks") or []
        if blanks:
            lines.append(f"Количество пропусков: {len(blanks)}")
        return lines

    if homework_type == "SHORT_ANSWER":
        if "max_length" in details:
            lines.append(f"Максимальная длина: {details.get('max_length')}")
        if "case_sensitive" in details:
            sensitive = "да" if details.get("case_sensitive") else "нет"
            lines.append(f"Учет регистра: {sensitive}")
        return lines

    if homework_type == "LONG_ANSWER":
        if "max_files" in details:
            lines.append(f"Максимум файлов: {details.get('max_files')}")
        return lines

    return lines


def format_homework_detail(homework) -> str:
    title = escape_markdown(homework.title or "")
    description = truncate_text(escape_markdown(homework.description or ""), max_length=800)
    type_label = escape_markdown(ASSIGNMENT_TYPE_LABELS.get(homework.type, homework.type or "Неизвестный тип"))

    lines = [
        f"📝 **{title}**",
        description or "Описание отсутствует.",
        "",
        f"Тип: **{type_label}**",
    ]

    if homework.max_score is not None:
        lines.append(f"Максимальный балл: **{homework.max_score}**")
    if homework.deadline:
        lines.append(f"Дедлайн: **{homework.deadline}**")

    detail_lines = _format_homework_details(homework.type, homework.details)
    if detail_lines:
        lines.append("")
        lines.append("**Детали:**")
        lines.extend(detail_lines)

    return "\n".join(lines)


def format_profile(profile: dict) -> str:
    first_name = profile.get("first_name") or ""
    last_name = profile.get("last_name") or ""
    patronymic = profile.get("patronymic") or ""
    full_name = escape_markdown(
        " ".join(part for part in [last_name, first_name, patronymic] if part).strip()
    )

    lines = ["👤 **Профиль**"]

    if full_name:
        lines.append(f"Имя: **{full_name}**")
    if profile.get("email"):
        lines.append(f"Email: `{escape_markdown(profile.get('email'))}`")
    if profile.get("role"):
        lines.append(f"Роль: **{escape_markdown(profile.get('role'))}**")
    if profile.get("age") is not None:
        lines.append(f"Возраст: **{profile.get('age')}**")
    if profile.get("contact_method"):
        lines.append(
            f"Предпочтительный контакт: {escape_markdown(profile.get('contact_method'))}"
        )
    if profile.get("bio"):
        lines.append("")
        lines.append(truncate_text(escape_markdown(profile.get("bio")), max_length=600))

    if len(lines) == 1:
        lines.append("Данные профиля не заполнены.")

    return "\n".join(lines)


def format_help(
    support_email: str,
    support_telegram: str,
) -> str:
    lines = [
        "ℹ️ **Помощь**",
        "Если возникли вопросы по курсам или заданиям, свяжитесь с поддержкой.",
    ]

    if support_email:
        lines.append(f"Email: `{escape_markdown(support_email)}`")
    if support_telegram:
        lines.append(f"Telegram: `{escape_markdown(support_telegram)}`")

    if not support_email and not support_telegram:
        lines.append("Контакты поддержки пока не настроены. Обратитесь к администратору курса.")

    return "\n".join(lines)
