from django.db import models
import secrets
from datetime import timedelta
from django.utils import timezone

from django.conf import settings

User = settings.AUTH_USER_MODEL


class TelegramLinkToken(models.Model):
    """Модель для хранения токенов привязки Telegram"""
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='telegram_tokens',
    )
    token = models.CharField(
        max_length=64,
        unique=True,
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    telegram_id = models.BigIntegerField(
        null=True,
        blank=True,
    )

    class Meta:
        indexes = [
            models.Index(fields=[
                'token',
                'is_used',
                'expires_at',
            ]),
        ]

    def save(self, *args, **kwargs):
        if not self.token:
            # Генерируем криптостойкий токен
            self.token = secrets.token_urlsafe(32)  # 43 символа
        if not self.expires_at:
            # Токен живет 15 минут
            self.expires_at = timezone.now() + timedelta(minutes=15)
        super().save(*args, **kwargs)

    @property
    def is_valid(self):
        return not self.is_used and self.expires_at > timezone.now()

    @classmethod
    def clean_expired(cls):
        """Очистка просроченных токенов"""
        cls.objects.filter(expires_at__lt=timezone.now()).delete()


class TelegramConnection(models.Model):
    """Постоянная связь пользователя с Telegram"""
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='telegram_connection',
    )
    telegram_id = models.BigIntegerField(unique=True)
    telegram_username = models.CharField(
        max_length=255,
        blank=True,
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['telegram_id']),
        ]