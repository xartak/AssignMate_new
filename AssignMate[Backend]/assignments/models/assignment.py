from django.db import models

from common.models import TimeStampedModel, SoftDeleteModel, OrderedWithinParentMixin
from assignments.choices import AssignmentType


class Assignment(OrderedWithinParentMixin, TimeStampedModel, SoftDeleteModel):
    """
    Модель домашних заданий к уроку.

    Attributes:
        lesson: ForeignKey - Вторичный ключ на модель уроков.
        title: CharField - Название ДЗ.
        description: TextField - Описание урока.
        type: CharField - Тип задания.
        max_score: PositiveIntegerField - Максимальная оценка.
        deadline: DateTimeField - Дедлайн сдачи.
        order: PositiveIntegerField - Порядковый номер задания.
        created_at: DateTimeField - Дата создания.
        updated_at: DateTimeField - Дата обновления.
    """
    lesson = models.ForeignKey(
        "courses.Lesson",
        on_delete=models.CASCADE,
        related_name="assignments",
    )

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    type = models.CharField(
        max_length=30,
        choices=AssignmentType,
    )

    max_score = models.PositiveIntegerField(default=5)
    deadline = models.DateTimeField(
        blank=True,
        null=True,
    )
    order = models.PositiveIntegerField(
        blank=True,
        null=True,
    )
    parent_field = "lesson"

    class Meta:
        """Метаданные модели задания."""
        verbose_name = "Assignment"
        verbose_name_plural = "Assignments"
        ordering = ["order"]
        constraints = [
            models.UniqueConstraint(
                fields=["lesson", "order"],
                condition=models.Q(deleted__isnull=True),
                name="unique_lesson_and_order_when_not_deleted",
            )
        ]

    def __str__(self) -> str:
        """Возвращает название задания.

        Returns:
            str: Название задания.
        """
        return self.title

    def save(self, *args, **kwargs):
        """
        Назначает порядковый номер задания в рамках урока.

        Если order не задан — добавляет в конец списка.

        Args:
            *args: Позиционные аргументы модели.
            **kwargs: Именованные аргументы модели.

        Returns:
            None.
        """
        self.assign_order_if_missing()
        super().save(*args, **kwargs)
