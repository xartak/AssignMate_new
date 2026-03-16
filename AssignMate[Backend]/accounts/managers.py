from django.contrib.auth.base_user import BaseUserManager
from django.utils.translation import gettext_lazy as _


class UserManager(BaseUserManager):
    """Менеджер пользователей с фабриками создания.

    Предоставляет методы создания обычных пользователей и суперпользователей.
    """

    def create_user(self, email: str, password: str | None = None, **extra_fields):
        """Создает и сохраняет обычного пользователя.

        Args:
            email: Email пользователя.
            password: Пароль пользователя.
            **extra_fields: Дополнительные поля модели пользователя.

        Returns:
            User: Созданный пользователь.

        Raises:
            ValueError: Если email не задан.
        """
        if not email:
            raise ValueError(_("Email must be set"))

        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email: str, password: str, **extra_fields):
        """Создает суперпользователя с необходимыми флагами.

        Args:
            email: Email суперпользователя.
            password: Пароль суперпользователя.
            **extra_fields: Дополнительные поля модели пользователя.

        Returns:
            User: Созданный суперпользователь.

        Raises:
            ValueError: Если флаги is_staff/is_superuser заданы некорректно.
        """
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", "ADMIN")

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email, password, **extra_fields)
