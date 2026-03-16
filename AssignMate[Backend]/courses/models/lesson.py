from django.db import models

from common.models import TimeStampedModel, SoftDeleteModel, OrderedWithinParentMixin
from courses.querysets import LessonManager


class Lesson(OrderedWithinParentMixin, TimeStampedModel, SoftDeleteModel):
    """
    Модель уроков.

    Attributes:
        course: ForeignKey - Вторичный ключ на курс.
        title: CharField - Название урока.
        description: TextField - Описание урока.
        duration: IntegerField - Длительность урока (в условных единицах).
        materials: FileField - Ссылка на материалы.
        order: PositiveIntegerField - Порядковый номер урока.
        created_at: DateTimeField - Дата создания.
        updated_at: DateTimeField - Дата обновления.
    """
    course = models.ForeignKey(
        "courses.Course",
        on_delete=models.CASCADE,
        related_name="lessons",
    )
    title = models.CharField(max_length=255)
    description = models.TextField(
        blank=True,
        null=True,
    )
    duration = models.IntegerField(default=1)
    materials = models.FileField(
        upload_to="lesson_materials/",
        blank=True,
        null=True,
    )
    order = models.PositiveIntegerField()

    objects = LessonManager()
    parent_field = "course"

    class Meta:
        """Метаданные модели урока."""
        unique_together = ("course", "order")
        ordering = ["order"]
        verbose_name = "Lesson"
        verbose_name_plural = "Lessons"
        constraints = [
            models.UniqueConstraint(
                fields=["course", "order"],
                condition=models.Q(deleted__isnull=True),
                name="unique_course_and_order_when_not_deleted",
            )
        ]

    def __str__(self) -> str:
        """Возвращает строковое представление урока.

        Returns:
            str: Строка вида "Курс: Название урока".
        """
        return f"{self.course}: {self.title}"

    def save(self, *args, **kwargs):
        """
        Если order не задан — ставим в конец.

        Args:
            *args: Позиционные аргументы модели.
            **kwargs: Именованные аргументы модели.

        Returns:
            None.
        """
        self.assign_order_if_missing()
        super().save(*args, **kwargs)
