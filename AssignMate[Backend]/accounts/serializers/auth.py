from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from telegram.models import TelegramConnection

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    """
    Сериализатор регистрации пользователя.

    Attributes:
        password: Пароль пользователя (только для записи).
        password_confirm: Подтверждение пароля (только для записи).
    """
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        error_messages={
            "min_length": "Пароль должен быть не короче 8 символов.",
            "required": "Пароль обязателен.",
            "blank": "Пароль обязателен.",
        },
    )
    password_confirm = serializers.CharField(
        write_only=True,
        min_length=8,
        error_messages={
            "min_length": "Подтверждение пароля должно быть не короче 8 символов.",
            "required": "Подтверждение пароля обязательно.",
            "blank": "Подтверждение пароля обязательно.",
        },
    )

    class Meta:
        """Конфигурация сериализатора регистрации.

        Attributes:
            model: Модель пользователя.
            fields: Набор полей сериализации.
        """
        model = User
        fields = (
            "email",
            "first_name",
            "last_name",
            "role",
            "password",
            "password_confirm",
        )

    def validate(self, attrs):
        """
        Проверяет совпадение пароля и подтверждения.

        Args:
            attrs: Валидируемые данные.

        Returns:
            dict: Валидированные данные.

        Raises:
            serializers.ValidationError: Если пароли не совпадают.
        """
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError(
                {"password": "Пароли не совпадают."}
            )
        return attrs

    def validate_email(self, value):
        """
        Проверяет уникальность email.

        Args:
            value: Email для проверки.

        Returns:
            str: Проверенный email.

        Raises:
            serializers.ValidationError: Если email уже зарегистрирован.
        """
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Этот email уже зарегистрирован.")
        return value

    def validate_password(self, value):
        """
        Проверяет пароль через валидаторы Django.

        Args:
            value: Пароль в открытом виде.

        Returns:
            str: Проверенный пароль.

        Raises:
            serializers.ValidationError: Если пароль не соответствует требованиям.
        """
        try:
            validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(self._translate_password_errors(exc.messages))
        return value

    @staticmethod
    def _translate_password_errors(messages):
        """Переводит сообщения валидаторов пароля на русский.

        Args:
            messages: Список сообщений от валидаторов Django.

        Returns:
            list[str]: Список переведенных сообщений.
        """
        translations = {
            "This password is too short. It must contain at least 8 characters.": "Пароль слишком короткий. Минимум 8 символов.",
            "This password is too common.": "Пароль слишком простой.",
            "This password is entirely numeric.": "Пароль не должен состоять только из цифр.",
            "This password is too similar to the username.": "Пароль слишком похож на имя пользователя.",
            "This password is too similar to the email address.": "Пароль слишком похож на email.",
        }
        translated = []
        for message in messages:
            translated.append(translations.get(message, message))
        return translated

    def create(self, validated_data):
        """
        Создает пользователя и хэширует пароль.

        Args:
            validated_data: Валидированные данные регистрации.

        Returns:
            User: Созданный пользователь.
        """
        validated_data.pop("password_confirm")

        user = User(
            email=validated_data["email"],
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            role=validated_data["role"],
        )
        user.set_password(validated_data["password"])
        user.save()
        return user


class JWTLoginSerializer(TokenObtainPairSerializer):
    """
    Сериализатор выдачи JWT токенов.
    """

    def validate(self, attrs):
        """
        Возвращает пару токенов и базовые данные пользователя.

        Args:
            attrs: Входные данные для аутентификации.

        Returns:
            dict: Данные ответа с токенами и профилем пользователя.
        """
        data = super().validate(attrs)
        user = self.user
        data["user"] = UserShortSerializer(user).data
        return data


class LogoutSerializer(serializers.Serializer):
    """
    Сериализатор выхода из системы.

    Attributes:
        refresh: Refresh-токен для инвалидирования.
    """
    refresh = serializers.CharField()


class UserShortSerializer(serializers.ModelSerializer):
    """
    Сериализатор кратких данных пользователя.
    """

    class Meta:
        """Конфигурация сериализатора пользователя.

        Attributes:
            model: Модель пользователя.
            fields: Набор полей для краткого представления.
        """
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "patronymic",
            "age",
            "avatar",
            "bio",
            "role",
        ]
        read_only_fields = fields


class UserMeSerializer(serializers.ModelSerializer):
    """
    Сериализатор данных текущего пользователя.
    """
    telegram_connected = serializers.SerializerMethodField()

    class Meta:
        """Конфигурация сериализатора пользователя.

        Attributes:
            model: Модель пользователя.
            fields: Набор полей профиля.
        """
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "patronymic",
            "age",
            "avatar",
            "bio",
            "contact_method",
            "role",
            "telegram_connected",
        ]
        read_only_fields = fields

    def get_telegram_connected(self, obj):
        return TelegramConnection.objects.filter(user=obj, is_active=True).exists()


class UserMeUpdateSerializer(serializers.ModelSerializer):
    """
    Сериализатор обновления профиля пользователя.
    """
    avatar = serializers.FileField(required=False, allow_null=True)

    class Meta:
        """Конфигурация сериализатора пользователя.

        Attributes:
            model: Модель пользователя.
            fields: Поля, доступные для обновления.
        """
        model = User
        fields = [
            "first_name",
            "last_name",
            "patronymic",
            "age",
            "avatar",
            "bio",
            "contact_method",
        ]
