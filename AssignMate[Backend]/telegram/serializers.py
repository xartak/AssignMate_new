from rest_framework import serializers
from django.conf import settings

User = settings.AUTH_USER_MODEL

class TelegramVerifyResponseSerializer(serializers.Serializer):
    """Сериализатор для ответа при верификации"""
    success = serializers.BooleanField()
    access_token = serializers.CharField()
    refresh_token = serializers.CharField()
    user_id = serializers.IntegerField()
    email = serializers.EmailField()

class UserInfoSerializer(serializers.ModelSerializer):
    """Сериализатор для информации о пользователе"""
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']