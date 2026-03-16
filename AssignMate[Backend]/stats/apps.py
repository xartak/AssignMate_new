from django.apps import AppConfig


class StatsConfig(AppConfig):
    """Конфигурация приложения stats.

    Attributes:
        default_auto_field: Тип авто-поля по умолчанию.
        name: Имя Django-приложения.
    """
    default_auto_field = "django.db.models.BigAutoField"
    name = "stats"
