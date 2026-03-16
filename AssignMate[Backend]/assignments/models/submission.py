from django.conf import settings
from django.db import models

from common.models import TimeStampedModel
from assignments.choices import SubmissionStatus, SubmissionTimelinessStatus

User = settings.AUTH_USER_MODEL


class Submission(TimeStampedModel):
    """
    Модель ответов на ДЗ.

    Attributes:
        assignment: ForeignKey - Вторичный ключ на модель ДЗ.
        student: ForeignKey - Вторичный ключ на студента.
        status: CharField - Статус проверки.
        timeliness_status: CharField - Статус сдачи относительно дедлайна.
        created_at: DateTimeField - Дата создания.
        updated_at: DateTimeField - Дата обновления.
    """
    assignment = models.ForeignKey(
        "assignments.Assignment",
        on_delete=models.CASCADE,
        related_name="submissions",
    )
    student = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="submissions",
    )

    status = models.CharField(
        max_length=20,
        choices=SubmissionStatus,
        default=SubmissionStatus.PENDING,
    )
    timeliness_status = models.CharField(
        max_length=20,
        choices=SubmissionTimelinessStatus,
        default=SubmissionTimelinessStatus.ON_TIME,
    )

    class Meta:
        """Метаданные модели ответа на задание."""
        unique_together = ("assignment", "student")
        verbose_name = "Submission"
        verbose_name_plural = "Submissions"

    def __str__(self) -> str:
        """Возвращает строковое представление ответа.

        Returns:
            str: Строка вида "Студент → Задание".
        """
        return f"{self.student} → {self.assignment}"

    def mark_reviewed(self):
        """Помечает ответ как проверенный.

        Returns:
            None.
        """
        self.status = SubmissionStatus.GRADED
        self.save(update_fields=["status"])
