from django.conf import settings
from django.db import models

from common.models import TimeStampedModel
from courses.choices import EnrollmentStatus

User = settings.AUTH_USER_MODEL


class Enrollment(TimeStampedModel):
    """
    Модель зачислений на курсы.

    Attributes:
        student: ForeignKey - Вторичный ключ на пользователя (студента).
        course: ForeignKey - Вторичный ключ на курс.
        status: CharField - Статус студента.
        enrolled_at: DateTimeField - Дата зачисления.
        created_at: DateTimeField - Дата создания.
        updated_at: DateTimeField -  Дата обновления.
    """
    student = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="enrollments",
    )
    course = models.ForeignKey(
        "courses.Course",
        on_delete=models.CASCADE,
        related_name="enrollments",
    )
    status = models.CharField(
        max_length=20,
        choices=EnrollmentStatus,
        default=EnrollmentStatus.ACTIVE,
    )
    enrolled_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        """Метаданные модели зачисления на курс."""
        unique_together = ("student", "course")
        verbose_name = "Enrollment"
        verbose_name_plural = "Enrollments"

    def __str__(self) -> str:
        """Возвращает строковое представление зачисления.

        Returns:
            str: Строка вида "Студент → Курс (статус)".
        """
        return f"{self.student} → {self.course} ({self.status})"

    def expel(self):
        """Отмечает зачисление как отчисленное.

        Returns:
            None.
        """
        self.status = EnrollmentStatus.EXPELLED
        self.save(update_fields=["status"])
