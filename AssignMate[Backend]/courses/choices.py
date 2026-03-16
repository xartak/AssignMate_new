from django.db import models


class EnrollmentStatus(models.TextChoices):
    """Статусы зачисления на курс.

    Attributes:
        ACTIVE: Активное зачисление.
        EXPELLED: Отчислен.
    """
    ACTIVE = "ACTIVE", "Active"
    EXPELLED = "EXPELLED", "Expelled"


class CourseStaffRole(models.TextChoices):
    """Роли сотрудников курса.

    Attributes:
        TEACHER: Преподаватель.
        ASSISTANT: Ассистент.
    """
    TEACHER = "TEACHER", "Teacher"
    ASSISTANT = "ASSISTANT", "Assistant"
