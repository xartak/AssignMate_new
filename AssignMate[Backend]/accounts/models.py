from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils.translation import gettext_lazy as _

from common.models import TimeStampedModel
from .choices import UserRole
from .managers import UserManager


class User(AbstractBaseUser, PermissionsMixin, TimeStampedModel):
    """
    Модель пользователя сайта.

    Attributes:
        email: Email пользователя (уникальный логин).
        first_name: Имя пользователя.
        last_name: Фамилия пользователя.
        patronymic: Отчество пользователя.
        age: Возраст пользователя.
        avatar: Файл аватара пользователя.
        bio: Описание/биография пользователя.
        contact_method: Предпочтительный способ связи.
        role: Роль пользователя в системе.
        is_active: Признак активного пользователя.
        is_staff: Признак доступа в административную часть.
        created_at: Дата и время создания записи.
        updated_at: Дата и время последнего обновления записи.
    """
    email = models.EmailField(
        unique=True,
        verbose_name="Email",
    )
    first_name = models.CharField(
        _("First name"),
        max_length=150,
        blank=True,
    )
    last_name = models.CharField(
        _("Last name"),
        max_length=150,
        blank=True,
    )
    patronymic = models.CharField(
        _("Patronymic"),
        max_length=150,
        blank=True,
    )
    age = models.PositiveSmallIntegerField(
        _("Age"),
        blank=True,
        null=True,
    )
    avatar = models.FileField(
        upload_to="avatars/",
        blank=True,
        null=True,
    )
    bio = models.TextField(
        blank=True,
    )
    contact_method = models.CharField(
        _("Contact method"),
        max_length=120,
        blank=True,
    )

    role = models.CharField(
        max_length=20,
        choices=UserRole,
    )

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    class Meta:
        """Метаданные модели пользователя."""
        verbose_name = _("User")
        verbose_name_plural = _("Users")

    def __str__(self) -> str:
        """Возвращает email как строковое представление пользователя.

        Returns:
            str: Email пользователя.
        """
        return self.email

    def get_full_name(self) -> str:
        """Возвращает полное имя пользователя.

        Returns:
            str: Полное имя пользователя.
        """
        return f"{self.first_name} {self.last_name}".strip()

    def get_short_name(self) -> str:
        """Возвращает короткое имя пользователя.

        Returns:
            str: Короткое имя пользователя или email.
        """
        return self.first_name or self.email

    @property
    def is_admin(self) -> bool:
        """Проверяет, что пользователь администратор.

        Returns:
            bool: True, если роль пользователя ADMIN.
        """
        return self.role == UserRole.ADMIN

    @property
    def is_teacher(self) -> bool:
        """Проверяет, что пользователь преподаватель.

        Returns:
            bool: True, если роль пользователя TEACHER.
        """
        return self.role == UserRole.TEACHER

    @property
    def is_assistant(self) -> bool:
        """Проверяет, что пользователь ассистент.

        Returns:
            bool: True, если роль пользователя ASSISTANT.
        """
        return self.role == UserRole.ASSISTANT

    @property
    def is_student(self) -> bool:
        """Проверяет, что пользователь студент.

        Returns:
            bool: True, если роль пользователя STUDENT.
        """
        return self.role == UserRole.STUDENT

    @property
    def is_parent(self) -> bool:
        """Проверяет, что пользователь родитель.

        Returns:
            bool: True, если роль пользователя PARENT.
        """
        return self.role == UserRole.PARENT


class ParentStudent(TimeStampedModel):
    """
    Модель родителей и студентов.

    Attributes:
        parent: Ссылка на пользователя-родителя.
        student: Ссылка на пользователя-студента.
        created_at: Дата и время создания записи.
        updated_at: Дата и время последнего обновления записи.
    """
    parent = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="children_links",
        limit_choices_to={"role": UserRole.PARENT},
    )
    student = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="parent_links",
        limit_choices_to={"role": UserRole.STUDENT},
    )

    class Meta:
        """Метаданные модели связи родитель-студент."""
        unique_together = ("parent", "student")
        verbose_name = "Parent-Student relation"
        verbose_name_plural = "Parent-Student relations"

    def __str__(self) -> str:
        """Возвращает строковое представление связи родитель-студент.

        Returns:
            str: Строка вида "parent → student".
        """
        return f"{self.parent.email} → {self.student.email}"
