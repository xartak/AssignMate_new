from django.db import models

from common.models import TimeStampedModel


class SubmissionFile(TimeStampedModel):
    """
    Модель файлов для развернутых ответов на ДЗ.

    Attributes:
        submission: ForeignKey - Вторичный ключ на модель ответов.
        file: FileField - Ссылка на место хранения файла.
        created_at: DateTimeField - Дата создания.
        updated_at: DateTimeField - Дата обновления.
    """
    submission = models.ForeignKey(
        "assignments.Submission",
        on_delete=models.CASCADE,
        related_name="files",
    )
    file = models.FileField(upload_to="submissions/")

    class Meta:
        """Метаданные модели файла ответа."""
        verbose_name = "Submission file"
        verbose_name_plural = "Submission files"
