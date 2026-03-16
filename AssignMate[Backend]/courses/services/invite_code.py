def generate_invite_code(course) -> str:
    """Генерирует и сохраняет код приглашения для курса.

    Args:
        course: Объект курса.

    Returns:
        str: Сгенерированный код приглашения.
    """
    return course.generate_invite_code()
