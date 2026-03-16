from django.conf import settings
from django.db import models

from common.models import TimeStampedModel

User = settings.AUTH_USER_MODEL


class Review(TimeStampedModel):
    """
    Модель ревью ДЗ.

    Attributes:
        submission: OneToOneField - Ключ на модель ответов на ДЗ.
        reviewer: ForeignKey - Проверяющий пользователь.
        score: PositiveIntegerField - Оценка ответа.
        comment: TextField - Комментарий к ответу.
        created_at: DateTimeField - Дата создания.
        updated_at: DateTimeField - Дата обновления.
    """
    submission = models.OneToOneField(
        "assignments.Submission",
        on_delete=models.CASCADE,
        related_name="review",
    )
    reviewer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="reviews",
    )
    score = models.PositiveIntegerField()
    comment = models.TextField(blank=True)

    class Meta:
        """Метаданные модели ревью."""
        verbose_name = "Review"
        verbose_name_plural = "Reviews"

    def __str__(self) -> str:
        """Возвращает строковое представление ревью.

        Returns:
            str: Строка вида "Review of <submission>".
        """
        return f"Review of {self.submission}"
