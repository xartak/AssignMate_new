from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from accounts.models import ParentStudent, User
from accounts.serializers import (
    RegisterSerializer,
    JWTLoginSerializer,
    LogoutSerializer,
    UserShortSerializer,
    UserMeSerializer,
    UserMeUpdateSerializer,
)


class RegisterAPIView(APIView):
    """
    API для регистрации пользователей.

    Endpoint:
        POST /api/v1/auth/register/
    """
    permission_classes = [AllowAny]

    def post(self, request):
        """
        Регистрирует пользователя и возвращает базовые данные.

        Args:
            request: DRF request с данными регистрации.

        Returns:
            Response: Ответ с токенами и профилем пользователя.
        """
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        if serializer.data.get("role") == "ADMIN" or serializer.data.get("role") == "Admin":
            return Response(
                {
                    "detail": "Роль Админитратора нельзя получить.",
                },
                status=status.HTTP_200_OK,
            )

        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "refresh": str(refresh),
                "access": str(refresh.access_token),
                "user": UserShortSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginAPIView(TokenObtainPairView):
    """
    API для получения пары JWT токенов.

    Endpoint:
        POST /api/v1/auth/login/
    """
    permission_classes = [AllowAny]
    serializer_class = JWTLoginSerializer


class RefreshAPIView(TokenRefreshView):
    """
    API для обновления access-токена.

    Endpoint:
        POST /api/v1/auth/refresh/
    """
    permission_classes = [AllowAny]


class LogoutAPIView(APIView):
    """
    API для выхода из системы.

    Endpoint:
        POST /api/v1/auth/logout/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        Инвалидирует refresh-токен.

        Args:
            request: DRF request с refresh-токеном.

        Returns:
            Response: Пустой ответ при успехе или ошибка при неверном токене.
        """
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            RefreshToken(serializer.validated_data["refresh"]).blacklist()
        except TokenError:
            return Response(
                {"detail": "Invalid refresh token."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(status=status.HTTP_205_RESET_CONTENT)


class MeAPIView(APIView):
    """
    API для получения данных текущего пользователя.

    Endpoints:
        GET /api/v1/auth/me/
        PATCH /api/v1/auth/me/
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        """
        Возвращает профиль текущего пользователя.

        Args:
            request: DRF request текущего пользователя.

        Returns:
            Response: Сериализованный профиль пользователя.
        """
        serializer = UserMeSerializer(
            request.user,
            context={"request": request},
        )
        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )

    def patch(self, request):
        """
        Обновляет профиль текущего пользователя.

        Args:
            request: DRF request с полями для обновления.

        Returns:
            Response: Обновленные данные пользователя.
        """
        serializer = UserMeUpdateSerializer(
            request.user,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        response_serializer = UserMeSerializer(
            user,
            context={"request": request},
        )
        return Response(
            response_serializer.data,
            status=status.HTTP_200_OK,
        )


class ParentChildrenAPIView(APIView):
    """
    API для управления связями родитель-ребёнок.

    Endpoints:
        GET  /api/v1/auth/children/          
        POST /api/v1/auth/children/         
        DELETE /api/v1/auth/children/<id>/
    """
    permission_classes = [IsAuthenticated]

    def _check_parent(self, user):
        if not user.is_parent:
            return Response(
                {"detail": "Доступно только для родителей."}, 
                status=status.HTTP_403_FORBIDDEN,
            )
        return None

    def get(self, request):
        err = self._check_parent(request.user)
        if err:
            return err
        links = ParentStudent.objects.filter(parent=request.user).select_related("student")
        data = [
            {
                "id": link.id,
                "student_id": link.student.id,
                "email": link.student.email,
                "first_name": link.student.first_name,
                "last_name": link.student.last_name,
            }
            for link in links
        ]
        return Response(data, status=status.HTTP_200_OK)

    def post(self, request):
        err = self._check_parent(request.user)
        if err:
            return err
        email = request.data.get("email", "").strip()
        if not email:
            return Response(
                {"detail": "Укажите email ученика."}, 
                status=status.HTTP_400_BAD_REQUEST,
            )
        student = User.objects.filter(email__iexact=email).first()
        if not student:
            return Response(
                {"detail": "Пользователь не найден."}, 
                status=status.HTTP_404_NOT_FOUND,
            )
        if not student.is_student:
            return Response(
                {"detail": "Пользователь не является учеником."}, 
                status=status.HTTP_400_BAD_REQUEST,
            )
        link, created = ParentStudent.objects.get_or_create(
            parent=request.user, 
            student=student,
            )
        data = {
            "id": link.id,
            "student_id": student.id,
            "email": student.email,
            "first_name": student.first_name,
            "last_name": student.last_name,
        }
        return Response(
            data, 
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    def delete(self, request, link_id=None):
        err = self._check_parent(request.user)
        if err:
            return err
        from django.shortcuts import get_object_or_404
        link = get_object_or_404(
            ParentStudent, 
            id=link_id, 
            parent=request.user,
        )
        link.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
