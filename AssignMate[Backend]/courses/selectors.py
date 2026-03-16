from courses.models import Course


def courses_for_dashboard(user):
    """Возвращает набор курсов для личного кабинета пользователя.

    Использует единые правила видимости, совпадающие с выборкой в API курсов.

    Args:
        user: Пользователь.

    Returns:
        QuerySet: Курсы, доступные пользователю.
    """
    return Course.objects.visible_to(user)
