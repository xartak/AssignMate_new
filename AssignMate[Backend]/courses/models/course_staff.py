from django.conf import settings
from django.db import models

from common.models import TimeStampedModel
from courses.choices import CourseStaffRole

User = settings.AUTH_USER_MODEL


class CourseStaff(TimeStampedModel):
    """
    Модель участников курса (staff).

    Attributes:
        course: Ссылка на курс.
        user: Ссылка на пользователя.
        role: Роль пользователя в рамках курса.
        created_at: Дата и время создания записи.
        updated_at: Дата и время последнего обновления записи.
    """
    course = models.ForeignKey(
        "courses.Course",
        on_delete=models.CASCADE,
        related_name="staff",
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="course_staff_roles",
    )
    role = models.CharField(
        max_length=20,
        choices=CourseStaffRole,
    )

    class Meta:
        """Метаданные модели участника курса."""
        unique_together = ("course", "user")
        verbose_name = "Course staff member"
        verbose_name_plural = "Course staff members"

    def __str__(self) -> str:
        """Возвращает строковое представление участника курса.

        Returns:
            str: Строка вида "Пользователь (роль) in Курс".
        """
        return f"{self.user} ({self.role}) in {self.course}"
