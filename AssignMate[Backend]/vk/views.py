import logging

from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import VKConnection, VKLinkCode
from .serializers import VKGenerateCodeResponseSerializer, VKVerifyResponseSerializer

logger = logging.getLogger(__name__)


class GenerateVKCodeView(APIView):
    """
    Генерация одноразового кода для привязки ВКонтакте.
    POST /api/v1/vk/generate-code/
    Требует JWT-авторизацию.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Удаляем неиспользованные коды — один активный код на пользователя.
        VKLinkCode.objects.filter(user=request.user, is_used=False).delete()

        link_code = VKLinkCode.objects.create(user=request.user)
        group_screen_name = getattr(settings, "VK_GROUP_SCREEN_NAME", "")
        group_link = (
            f"https://vk.com/{group_screen_name}" if group_screen_name else ""
        )

        logger.info(f"Generated VK link code for user {request.user.id}")

        data = {
            "code": link_code.code,
            "expires_at": link_code.expires_at,
            "group_link": group_link,
            "note": "Код действителен 15 минут. Отправьте его в сообщения сообщества ВКонтакте.",
        }
        serializer = VKGenerateCodeResponseSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.data)


class VerifyVKCodeView(APIView):
    """
    Верификация кода ботом ВКонтакте.
    POST /api/v1/vk/verify/
    Требует заголовок X-Service-Token.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        service_token = request.headers.get("X-Service-Token")
        expected = getattr(settings, "VK_BOT_SERVICE_TOKEN", None)
        if not expected or service_token != expected:
            logger.warning(f"Invalid VK service token attempt: {service_token!r}")
            return Response(
                {"error": "Invalid service token"},
                status=status.HTTP_403_FORBIDDEN,
            )

        code = request.data.get("code")
        vk_user_id = request.data.get("vk_user_id")
        vk_screen_name = request.data.get("vk_screen_name", "") or ""

        if not code or not vk_user_id:
            return Response(
                {"error": "code and vk_user_id required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            link_code = VKLinkCode.objects.select_related("user").get(
                code=code,
                is_used=False,
                expires_at__gt=timezone.now(),
            )
        except VKLinkCode.DoesNotExist:
            logger.warning(f"Invalid or expired VK code attempt: {code}")
            return Response(
                {"error": "Invalid or expired code"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        existing = VKConnection.objects.filter(vk_user_id=vk_user_id).first()
        if existing:
            if existing.user_id != link_code.user_id:
                return Response(
                    {"error": "This VK account is already linked to another user"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            existing.vk_screen_name = vk_screen_name
            existing.is_active = True
            existing.save()
            logger.info(f"Updated VK connection for user {link_code.user_id}")
        else:
            VKConnection.objects.create(
                user=link_code.user,
                vk_user_id=vk_user_id,
                vk_screen_name=vk_screen_name,
                is_active=True,
            )
            logger.info(f"Created VK connection for user {link_code.user_id}")

        link_code.is_used = True
        link_code.vk_user_id = vk_user_id
        link_code.save(update_fields=["is_used", "vk_user_id"])

        refresh = RefreshToken.for_user(link_code.user)

        response_data = {
            "success": True,
            "access_token": str(refresh.access_token),
            "refresh_token": str(refresh),
            "user_id": link_code.user.id,
            "email": link_code.user.email,
        }
        serializer = VKVerifyResponseSerializer(data=response_data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.data)
