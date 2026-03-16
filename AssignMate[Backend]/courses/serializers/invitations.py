from rest_framework import serializers


class CourseInviteCodeSerializer(serializers.Serializer):
    """
    Сериализатор выдачи кода приглашения.

    Attributes:
        course_id: Идентификатор курса.
        invite_code: Код приглашения.
        created_at: Дата и время генерации кода.
    """
    course_id = serializers.IntegerField()
    invite_code = serializers.CharField()
    created_at = serializers.DateTimeField()


class CourseJoinSerializer(serializers.Serializer):
    """
    Сериализатор присоединения к курсу по коду.

    Attributes:
        invite_code: Код приглашения.
    """
    invite_code = serializers.CharField()

    def validate_invite_code(self, value: str) -> str:
        """
        Нормализует код приглашения.

        Args:
            value: Введенный код приглашения.

        Returns:
            str: Нормализованный код (trim + upper).
        """
        return value.strip().upper()
