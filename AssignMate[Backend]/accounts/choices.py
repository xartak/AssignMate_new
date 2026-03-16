from django.db import models


class UserRole(models.TextChoices):
    """Роли пользователей системы.

    Attributes:
        ADMIN: Администратор системы.
        TEACHER: Преподаватель.
        ASSISTANT: Ассистент преподавателя.
        STUDENT: Студент.
        PARENT: Родитель.
    """
    ADMIN = "ADMIN", "Administrator"
    TEACHER = "TEACHER", "Teacher"
    ASSISTANT = "ASSISTANT", "Assistant"
    STUDENT = "STUDENT", "Student"
    PARENT = "PARENT", "Parent"
