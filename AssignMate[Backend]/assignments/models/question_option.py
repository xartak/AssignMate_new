from django.db import models

from common.models import TimeStampedModel


class QuestionOption(TimeStampedModel):
    """
    Вариант ответа для заданий с выбором.

    Attributes:
        assignment: ForeignKey - Вторичный ключ на модель ДЗ.
        text: CharField - Текст варианта.
        is_correct: BooleanField - Метка о корректности.
        created_at: DateTimeField - Дата создания.
        updated_at: DateTimeField - Дата обновления.
    """
    assignment = models.ForeignKey(
        "assignments.Assignment",
        on_delete=models.CASCADE,
        related_name="options",
    )
    text = models.CharField(max_length=255)
    is_correct = models.BooleanField(default=False)

    class Meta:
        """Метаданные модели варианта ответа."""
        verbose_name = "Question option"
        verbose_name_plural = "Question options"

    def __str__(self) -> str:
        """Возвращает текст варианта ответа.

        Returns:
            str: Текст варианта ответа.
        """
        return self.text
