from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.crypto import get_random_string

from common.models import TimeStampedModel, SoftDeleteModel
from courses.querysets import CourseManager

User = settings.AUTH_USER_MODEL

INVITE_CODE_LENGTH = 8


class Course(TimeStampedModel, SoftDeleteModel):
    """
    Модель курсов.

    Attributes:
        title: CharField - Название курса.
        description: TextField - Описание курса.
        author: ForeignKey - Автор курса.
        grading_scale: JSONField - Шкала оценки.
        invite_code: CharField - Код приглашения на курс.
        invite_code_created_at: DateTimeField - Дата генерации кода приглашения.
        created_at: DateTimeField - Дата создания.
        updated_at: DateTimeField - Дата обновления.
    """
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    author = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
    )
    invite_code = models.CharField(
        max_length=32,
        blank=True,
        null=True,
        unique=True,
    )
    invite_code_created_at = models.DateTimeField(
        blank=True,
        null=True,
    )

    grading_scale = models.JSONField(
        default=dict,
        blank=True,
    )

    objects = CourseManager()

    class Meta:
        """Метаданные модели курса."""
        verbose_name = "Course"
        verbose_name_plural = "Courses"

    def __str__(self) -> str:
        """Возвращает название курса.

        Returns:
            str: Название курса.
        """
        return self.title

    def generate_invite_code(self, length: int = INVITE_CODE_LENGTH) -> str:
        """
        Генерирует и сохраняет код приглашения.

        Args:
            length: Длина кода приглашения.

        Returns:
            Строка с кодом приглашения.
        """
        manager = getattr(type(self), "all_objects", type(self).objects)
        code = get_random_string(length=length).upper()
        while manager.filter(invite_code=code).exclude(pk=self.pk).exists():
            code = get_random_string(length=length).upper()

        self.invite_code = code
        self.invite_code_created_at = timezone.now()
        self.save(update_fields=["invite_code", "invite_code_created_at"])
        return code
