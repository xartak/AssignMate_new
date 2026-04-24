import secrets
from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone

User = settings.AUTH_USER_MODEL

# Алфавит без легко путаемых символов (0/O, 1/I).
_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
_CODE_LENGTH = 8


def _generate_code() -> str:
    return "".join(secrets.choice(_CODE_ALPHABET) for _ in range(_CODE_LENGTH))


class VKLinkCode(models.Model):
    """
    Одноразовый код для привязки VK-аккаунта к пользователю AssignMate.

    Пользователь получает код в личном кабинете, отправляет его боту ВК,
    бот верифицирует код через /api/v1/vk/verify/.
    """

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="vk_link_codes",
    )
    code = models.CharField(
        max_length=16,
        unique=True,
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    vk_user_id = models.BigIntegerField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["code", "is_used", "expires_at"]),
        ]

    def save(self, *args, **kwargs):
        if not self.code:
            # Повторяем попытки на случай коллизии — вероятность мизерная,
            # но на 32^8 пространстве возможна.
            for _ in range(5):
                candidate = _generate_code()
                if not VKLinkCode.objects.filter(code=candidate).exists():
                    self.code = candidate
                    break
            else:
                self.code = _generate_code()
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(minutes=15)
        super().save(*args, **kwargs)

    @property
    def is_valid(self) -> bool:
        return not self.is_used and self.expires_at > timezone.now()

    @classmethod
    def clean_expired(cls) -> None:
        cls.objects.filter(expires_at__lt=timezone.now()).delete()


class VKConnection(models.Model):
    """Постоянная связь пользователя AssignMate с аккаунтом ВКонтакте."""

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="vk_connection",
    )
    vk_user_id = models.BigIntegerField(unique=True)
    vk_screen_name = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["vk_user_id"]),
        ]
