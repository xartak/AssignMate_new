from django.db import models


class AssignmentType(models.TextChoices):
    """Типы домашних заданий.

    Attributes:
        SINGLE_CHOICE: Выбор одного варианта.
        MULTIPLE_CHOICE: Выбор нескольких вариантов.
        FILL_BLANK: Заполнение пропусков.
        SHORT_ANSWER: Краткий ответ.
        LONG_ANSWER: Развернутый ответ.
    """
    SINGLE_CHOICE = "SINGLE_CHOICE", "Single choice"
    MULTIPLE_CHOICE = "MULTIPLE_CHOICE", "Multiple choice"
    FILL_BLANK = "FILL_BLANK", "Fill blank"
    SHORT_ANSWER = "SHORT_ANSWER", "Short answer"
    LONG_ANSWER = "LONG_ANSWER", "Long answer"


class SubmissionStatus(models.TextChoices):
    """Статусы проверки ответов на задания.

    Attributes:
        PENDING: Ожидает проверки.
        REVISION: Возвращен на доработку.
        GRADED: Проверен и оценен.
    """
    PENDING = "PENDING", "Pending"
    REVISION = "REVISION", "Revision"
    GRADED = "GRADED", "Graded"


class SubmissionTimelinessStatus(models.TextChoices):
    """Статус сдачи относительно дедлайна.

    Attributes:
        ON_TIME: Сдано вовремя.
        LATE: Сдано после дедлайна.
    """
    ON_TIME = "ON_TIME", "On time"
    LATE = "LATE", "Late"
