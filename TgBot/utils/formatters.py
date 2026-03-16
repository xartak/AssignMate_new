def truncate_text(
    text: str,
    max_length: int = 100,
    suffix: str = "...",
) -> str:
    """Обрезает текст до указанной длины"""
    if len(text) <= max_length:
        return text
    return text[:max_length - len(suffix)] + suffix


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