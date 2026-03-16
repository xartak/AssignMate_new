from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
import logging

from django.conf import settings
from rest_framework_simplejwt.tokens import RefreshToken

from .models import TelegramLinkToken, TelegramConnection
from .serializers import TelegramVerifyResponseSerializer

logger = logging.getLogger(__name__)


class GenerateTelegramLinkView(APIView):
    """
    Эндпоинт для генерации ссылки на привязку Telegram
    POST /telegram/generate-link/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Удаляем старые неиспользованные токены пользователя
        TelegramLinkToken.objects.filter(
            user=request.user,
            is_used=False
        ).delete()

        # Создаем новый токен
        link_token = TelegramLinkToken.objects.create(user=request.user)

        # Формируем ссылку для бота
        bot_username = settings.TELEGRAM_BOT_USERNAME
        deep_link = f"https://t.me/{bot_username}?start={link_token.token}"

        logger.info(f"Generated Telegram link for user {request.user.id}")

        return Response({
            'link': deep_link,
            'token': link_token.token,
            'expires_at': link_token.expires_at,
            'note': 'Ссылка действительна 15 минут'
        })


class VerifyTelegramTokenView(APIView):
    """
    Эндпоинт для верификации токена (вызывается ботом)
    POST /telegram/verify/
    """
    permission_classes = [AllowAny]

    def post(self, request):
        # Проверяем сервисный токен бота
        service_token = request.headers.get('X-Service-Token')
        if service_token != settings.BOT_SERVICE_TOKEN:
            logger.warning(f"Invalid service token attempt: {service_token}")
            return Response(
                {'error': 'Invalid service token'},
                status=status.HTTP_403_FORBIDDEN
            )

        token = request.data.get('token')
        telegram_id = request.data.get('telegram_id')
        telegram_username = request.data.get('telegram_username', '')

        logger.info(f"Verify attempt - token: {token}, telegram_id: {telegram_id}")

        if not token or not telegram_id:
            return Response(
                {'error': 'Token and telegram_id required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Ищем валидный токен
            link_token = TelegramLinkToken.objects.select_related('user').get(
                token=token,
                is_used=False,
                expires_at__gt=timezone.now()
            )

            # Проверяем существующие связи
            existing_connection = TelegramConnection.objects.filter(
                telegram_id=telegram_id
            ).first()

            if existing_connection:
                if existing_connection.user_id != link_token.user_id:
                    return Response(
                        {'error': 'This Telegram account is already linked to another user'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                else:
                    # Обновляем существующую связь
                    connection = existing_connection
                    connection.telegram_username = telegram_username
                    connection.save()
                    logger.info(f"Updated existing connection for user {link_token.user_id}")
            else:
                # Создаем новую связь
                connection = TelegramConnection.objects.create(
                    user=link_token.user,
                    telegram_id=telegram_id,
                    telegram_username=telegram_username,
                    is_active=True
                )
                logger.info(f"Created new connection for user {link_token.user_id}")

            # Помечаем токен как использованный
            link_token.is_used = True
            link_token.save()

            # Генерируем JWT для бота
            refresh = RefreshToken.for_user(link_token.user)

            # ВАЖНО: Возвращаем ТОЛЬКО сериализуемые данные
            response_data = {
                'success': True,
                'access_token': str(refresh.access_token),
                'refresh_token': str(refresh),
                'user_id': link_token.user.id,
                'email': link_token.user.email,
                'first_name': link_token.user.first_name,
                'last_name': link_token.user.last_name
            }

            logger.info(f"Successfully linked Telegram {telegram_id} to user {link_token.user.id}")

            # Можно использовать сериализатор для валидации
            serializer = TelegramVerifyResponseSerializer(data=response_data)
            serializer.is_valid(raise_exception=True)

            return Response(serializer.data)

        except TelegramLinkToken.DoesNotExist:
            logger.warning(f"Invalid or expired token attempt: {token}")
            return Response(
                {'error': 'Invalid or expired token'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Unexpected error in verification: {str(e)}", exc_info=True)
            return Response(
                {'error': 'Internal server error'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )