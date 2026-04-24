def truncate_text(text: str, max_length: int = 100, suffix: str = "...") -> str:
    if not text:
        return ""
    if len(text) <= max_length:
        return text
    return text[: max_length - len(suffix)] + suffix


ASSIGNMENT_TYPE_LABELS = {
    "SINGLE_CHOICE": "Один вариант",
    "MULTIPLE_CHOICE": "Несколько вариантов",
    "FILL_BLANK": "Заполнить пропуски",
    "SHORT_ANSWER": "Краткий ответ",
    "LONG_ANSWER": "Развёрнутый ответ",
}


def format_empty_courses() -> str:
    return (
        "📭 Курсы не найдены.\n\n"
        "На данный момент у вас нет доступных курсов.\n"
        "• Возможно, вы ещё не записаны ни на один курс\n"
        "• Курсы могут находиться в разработке\n"
        "• Или это временная техническая проблема\n\n"
        "Попробуйте позже или свяжитесь с поддержкой."
    )


def format_courses_header(page: int, has_next: bool) -> str:
    message = "📚 Доступные курсы\nВыберите курс из списка ниже."
    if page > 1 or has_next:
        message += f"\n\nСтраница: {page}"
    return message


def format_lessons_header(course_title: str, page: int, has_next: bool) -> str:
    title = course_title or "Курс"
    message = f"📘 {title}\nВыберите урок."
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
    course = course_title or "Курс"
    lesson = lesson_title or f"Урок {lesson_order}"
    message = (
        f"📗 {course}\n"
        f"Урок {lesson_order}: {lesson}\n"
        "Выберите задание."
    )
    if page > 1 or has_next:
        message += f"\n\nСтраница: {page}"
    return message


def _format_homework_details(homework_type: str, details: dict | None) -> list[str]:
    if not details:
        return []

    lines: list[str] = []

    if homework_type in {"SINGLE_CHOICE", "MULTIPLE_CHOICE"}:
        options = details.get("options") or []
        if options:
            option_lines = [
                f"• {truncate_text(option.get('text', ''), 80)}"
                for option in options
                if isinstance(option, dict)
            ]
            if option_lines:
                lines.append("Варианты ответа:")
                lines.extend(option_lines)
        if "shuffle_options" in details:
            shuffle = "да" if details.get("shuffle_options") else "нет"
            lines.append(f"Перемешивание: {shuffle}")
        return lines

    if homework_type == "FILL_BLANK":
        template = details.get("text_template")
        if template:
            lines.append("Шаблон:")
            lines.append(truncate_text(template, 300))
        blanks = details.get("blanks") or []
        if blanks:
            lines.append(f"Пропусков: {len(blanks)}")
        return lines

    if homework_type == "SHORT_ANSWER":
        if "max_length" in details:
            lines.append(f"Максимальная длина: {details.get('max_length')}")
        if "case_sensitive" in details:
            lines.append(
                f"Учёт регистра: {'да' if details.get('case_sensitive') else 'нет'}"
            )
        return lines

    if homework_type == "LONG_ANSWER":
        if "max_files" in details:
            lines.append(f"Максимум файлов: {details.get('max_files')}")
        return lines

    return lines


def format_homework_detail(homework) -> str:
    title = homework.title or "Задание"
    description = truncate_text(homework.description or "", 800) or "Описание отсутствует."
    type_label = ASSIGNMENT_TYPE_LABELS.get(homework.type, homework.type or "Тип не указан")

    lines = [
        f"📝 {title}",
        description,
        "",
        f"Тип: {type_label}",
    ]

    if homework.max_score is not None:
        lines.append(f"Максимальный балл: {homework.max_score}")
    if homework.deadline:
        lines.append(f"Дедлайн: {homework.deadline}")

    detail_lines = _format_homework_details(homework.type, homework.details)
    if detail_lines:
        lines.append("")
        lines.append("Детали:")
        lines.extend(detail_lines)

    return "\n".join(lines)


def format_profile(profile: dict) -> str:
    first_name = profile.get("first_name") or ""
    last_name = profile.get("last_name") or ""
    patronymic = profile.get("patronymic") or ""
    full_name = " ".join(part for part in [last_name, first_name, patronymic] if part).strip()

    lines = ["👤 Профиль"]

    if full_name:
        lines.append(f"Имя: {full_name}")
    if profile.get("email"):
        lines.append(f"Email: {profile.get('email')}")
    if profile.get("role"):
        lines.append(f"Роль: {profile.get('role')}")
    if profile.get("age") is not None:
        lines.append(f"Возраст: {profile.get('age')}")
    if profile.get("contact_method"):
        lines.append(f"Предпочтительный контакт: {profile.get('contact_method')}")
    if profile.get("bio"):
        lines.append("")
        lines.append(truncate_text(profile.get("bio"), 600))

    if len(lines) == 1:
        lines.append("Данные профиля не заполнены.")

    return "\n".join(lines)


def format_help(support_email: str, support_telegram: str, support_vk: str = "") -> str:
    lines = [
        "ℹ️ Помощь",
        "Если возникли вопросы по курсам или заданиям — свяжитесь с поддержкой.",
    ]
    if support_email:
        lines.append(f"Email: {support_email}")
    if support_telegram:
        lines.append(f"Telegram: {support_telegram}")
    if support_vk:
        lines.append(f"ВКонтакте: {support_vk}")
    if not (support_email or support_telegram or support_vk):
        lines.append("Контакты поддержки пока не настроены. Обратитесь к администратору.")
    return "\n".join(lines)


def format_link_instructions(group_link: str = "") -> str:
    lines = [
        "👋 Здравствуйте!",
        "",
        "Чтобы использовать бота, привяжите аккаунт AssignMate.",
        "",
        "1. Зайдите на сайт AssignMate и откройте личный кабинет.",
        "2. Нажмите «Привязать ВКонтакте» — вы получите 8-значный код.",
        "3. Отправьте код в этот чат одним сообщением.",
        "",
        "Код действует 15 минут.",
    ]
    if group_link:
        lines.append("")
        lines.append(f"Сообщество: {group_link}")
    return "\n".join(lines)


def format_link_success(email: str) -> str:
    who = email or "пользователь"
    return (
        f"✅ Привязка успешна. Добро пожаловать, {who}!\n\n"
        "Теперь вам доступны курсы через кнопки меню."
    )
