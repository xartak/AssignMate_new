class CourseJoinError(Exception):
    """Базовая ошибка присоединения к курсу."""


class AlreadyEnrolledError(CourseJoinError):
    """Пользователь уже зачислен на курс."""
