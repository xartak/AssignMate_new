from rest_framework import serializers


class VKVerifyResponseSerializer(serializers.Serializer):
    """Ответ при успешной верификации кода ботом ВК."""

    success = serializers.BooleanField()
    access_token = serializers.CharField()
    refresh_token = serializers.CharField()
    user_id = serializers.IntegerField()
    email = serializers.EmailField()


class VKGenerateCodeResponseSerializer(serializers.Serializer):
    """Ответ генерации одноразового кода привязки для фронта."""

    code = serializers.CharField()
    expires_at = serializers.DateTimeField()
    group_link = serializers.CharField()
    note = serializers.CharField(required=False)
