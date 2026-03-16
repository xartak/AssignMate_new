from django.db import models

from safedelete.models import SafeDeleteModel, SOFT_DELETE_CASCADE


class TimeStampedModel(models.Model):
    """
    Абстрактная модель с временными метками.

    Используется для аудита и автоматического хранения дат создания/обновления.

    Attributes:
        created_at: Дата и время создания записи.
        updated_at: Дата и время последнего обновления записи.
    """
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        """Метаданные абстрактной модели с временными метками."""
        abstract = True


class SoftDeleteModel(SafeDeleteModel):
    """
    Абстрактная модель с soft-delete на базе django-safedelete.

    - Объекты не удаляются физически
    - Поддерживается восстановление
    - Корректно работает с related-объектами

    Attributes:
        _safedelete_policy: Политика удаления с каскадом для связанных объектов.
    """
    _safedelete_policy = SOFT_DELETE_CASCADE

    class Meta:
        """Метаданные абстрактной модели с soft-delete."""
        abstract = True


class OrderedWithinParentMixin:
    """
    Миксин для автоматического назначения порядкового номера в рамках родителя.

    Attributes:
        order_field: Имя поля, хранящего порядок.
        parent_field: Имя поля связи с родительским объектом.
    """
    order_field = "order"
    parent_field = None

    def assign_order_if_missing(self):
        """Назначает следующий порядок, если он не задан.

        Returns:
            None.
        """
        if self.pk is not None:
            return
        order_field = self.order_field
        if getattr(self, order_field, None) is not None:
            return
        parent_field = self.parent_field
        if not parent_field:
            return
        parent_value = getattr(self, parent_field)
        last_order = (
            self.__class__.objects
            .filter(**{parent_field: parent_value})
            .aggregate(models.Max(order_field))
            .get(f"{order_field}__max")
        )
        setattr(self, order_field, (last_order or 0) + 1)
