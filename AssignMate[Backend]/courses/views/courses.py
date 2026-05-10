from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from accounts.models import User

from courses.permissions import (
    CanCreateCourse,
    CanDeleteCourse,
    CanEditCourse,
    CanReadCourse,
    CanGenerateInviteCode,
    CanJoinCourse,
)
from courses.models import Course
from common.viewsets import ActionPermissionsMixin, ActionSerializerMixin
from courses.selectors import courses_for_dashboard
from courses.models import CourseStaff
from courses.policies import CoursePolicy, get_assistant_staff
from courses.choices import CourseStaffRole
from courses.serializers import (
    CourseReadSerializer,
    CourseCreateSerializer,
    CourseUpdateSerializer,
    CourseInviteCodeSerializer,
    CourseJoinSerializer,
    EnrollmentSerializer,
    AssistantPermissionsSerializer,
)
from courses.services import generate_invite_code, join_course
from courses.services.exceptions import AlreadyEnrolledError


class CourseViewSet(ActionPermissionsMixin, ActionSerializerMixin, ModelViewSet):
    """
    API endpoint для курсов.

    Methods:
        GET: courses/
        POST: courses/
        PATCH: courses/<int:course_pk>/
        PUT: courses/<int:course_pk>/
        DELETE: courses/<int:course_pk>/
        POST: courses/<int:course_pk>/invite-code/
    """
    permission_classes = [CanReadCourse]
    serializer_class = CourseReadSerializer
    serializer_action_classes = {
        "create": CourseCreateSerializer,
        "update": CourseUpdateSerializer,
        "partial_update": CourseUpdateSerializer,
    }
    permission_classes_by_action = {
        "list": [CanReadCourse],
        "retrieve": [CanReadCourse],
        "create": [CanCreateCourse],
        "update": [CanEditCourse],
        "partial_update": [CanEditCourse],
        "destroy": [CanDeleteCourse],
        "invite_code": [CanGenerateInviteCode],
    }
    def get_queryset(self):
        """
        Метод для получения списка объектов.

        Выдает курсы, доступные пользователю.

        Returns:
            QuerySet: Курсы, доступные текущему пользователю.
        """
        user = self.request.user
        return Course.objects.visible_to(user)

    def perform_create(self, serializer):
        """Сохраняет автора курса при создании.

        Args:
            serializer: Сериализатор курса.

        Returns:
            None.
        """
        serializer.save(author=self.request.user)

    @action(detail=True, methods=["post"], url_path="invite-code")
    def invite_code(self, request, *args, **kwargs):
        """
        Генерирует код приглашения для курса.

        Args:
            request: DRF request.
            *args: Позиционные аргументы DRF.
            **kwargs: Именованные аргументы DRF.

        Returns:
            Response: Данные с кодом приглашения.
        """
        course = self.get_object()
        code = generate_invite_code(course)
        serializer = CourseInviteCodeSerializer(
            {
                "course_id": course.id,
                "invite_code": code,
                "created_at": course.invite_code_created_at,
            }
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="join-by-code", permission_classes=[CanJoinCourse])
    def join_by_code(self, request, *args, **kwargs):
        """
        Присоединяет студента к курсу по коду приглашения без указания курса.

        Args:
            request: DRF request с кодом приглашения.
            *args: Позиционные аргументы DRF.
            **kwargs: Именованные аргументы DRF.

        Returns:
            Response: Данные зачисления на курс.
            Response: Ошибка 409, если студент уже зачислен на курс.
        """
        serializer = CourseJoinSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        invite_code = serializer.validated_data["invite_code"]

        course = get_object_or_404(Course.objects, invite_code__iexact=invite_code)
        try:
            enrollment, created = join_course(student=request.user, course=course)
        except AlreadyEnrolledError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_409_CONFLICT,
            )
        output = EnrollmentSerializer(enrollment)
        return Response(
            output.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"], url_path="my", permission_classes=[IsAuthenticated])
    def my(self, request, *args, **kwargs):
        """
        Возвращает курсы, к которым у пользователя есть доступ.

        Args:
            request: DRF request текущего пользователя.
            *args: Позиционные аргументы DRF.
            **kwargs: Именованные аргументы DRF.

        Returns:
            Response: Список курсов пользователя.
        """
        queryset = courses_for_dashboard(request.user)
        serializer = CourseReadSerializer(
            queryset, 
            many=True,
        )
        return Response(
            serializer.data, 
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get"], url_path="my-permissions", permission_classes=[IsAuthenticated])
    def my_permissions(self, request, *args, **kwargs):
        """
        Возвращает флаги разрешений текущего ассистента для этого курса.

        Args:
            request: DRF request.
            *args: Позиционные аргументы DRF.
            **kwargs: Именованные аргументы DRF.

        Returns:
            Response: Флаги разрешений ассистента или 404.
        """
        course = self.get_object()
        staff = get_assistant_staff(request.user, course)
        if not staff:
            return Response(
                {
                    "can_edit_homework": False, 
                    "can_review_homework": False, 
                    "can_add_homework": False, 
                    "can_add_materials": False,
                },
                status=status.HTTP_200_OK,
            )
        serializer = AssistantPermissionsSerializer(staff)
        return Response(
            serializer.data, 
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get"], url_path="assistants", permission_classes=[IsAuthenticated])
    def assistants(self, request, *args, **kwargs):
        """
        Возвращает список ассистентов курса с их флагами разрешений.
        Доступно только автору курса и администратору.

        Args:
            request: DRF request.
            *args: Позиционные аргументы DRF.
            **kwargs: Именованные аргументы DRF.

        Returns:
            Response: Список ассистентов с флагами.
        """
        course = self.get_object()
        if not CoursePolicy.can_edit(request.user, course):
            return Response(
                {"detail": "Нет прав."}, 
                status=status.HTTP_403_FORBIDDEN,
            )
        staff_qs = CourseStaff.objects.filter(
            course=course,
            role=CourseStaffRole.ASSISTANT,
        ).select_related("user")
        serializer = AssistantPermissionsSerializer(staff_qs, many=True)
        return Response(
            serializer.data, 
            status=status.HTTP_200_OK,
            )

    @action(detail=True, methods=["post"], url_path="add-assistant", permission_classes=[IsAuthenticated])
    def add_assistant(self, request, *args, **kwargs):
        """
        Добавляет пользователя в качестве ассистента курса по email.
        Доступно только автору курса и администратору.
        """
        course = self.get_object()
        if not CoursePolicy.can_edit(request.user, course):
            return Response(
                {"detail": "Нет прав."}, 
                status=status.HTTP_403_FORBIDDEN,
            )
        email = request.data.get("email", "").strip()
        if not email:
            return Response(
                {"detail": "Укажите email пользователя."}, 
                status=status.HTTP_400_BAD_REQUEST,
            )
        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response(
                {"detail": "Пользователь не найден."}, 
                status=status.HTTP_404_NOT_FOUND,
            )
        if not user.is_assistant:
            return Response(
                {"detail": "Пользователь не является ассистентом."}, 
                status=status.HTTP_400_BAD_REQUEST,
            )
        staff, created = CourseStaff.objects.get_or_create(
            course=course,
            user=user,
            defaults={"role": CourseStaffRole.ASSISTANT},
        )
        if not created and staff.role != CourseStaffRole.ASSISTANT:
            return Response(
                {"detail": "Пользователь уже состоит в курсе в другой роли."}, 
                status=status.HTTP_409_CONFLICT,
            )
        serializer = AssistantPermissionsSerializer(staff)
        return Response(
            serializer.data, 
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(detail=True, methods=["delete"], url_path=r"remove-assistant/(?P<user_id>[0-9]+)", permission_classes=[IsAuthenticated])
    def remove_assistant(self, request, user_id=None, *args, **kwargs):
        """
        Удаляет ассистента из курса.
        Доступно только автору курса и администратору.
        """
        course = self.get_object()
        if not CoursePolicy.can_edit(request.user, course):
            return Response(
                {"detail": "Нет прав."}, 
                status=status.HTTP_403_FORBIDDEN,
            )
        staff = get_object_or_404(
            CourseStaff, 
            course=course, 
            user_id=user_id, 
            role=CourseStaffRole.ASSISTANT,
        )
        staff.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["get", "patch"], url_path=r"staff/(?P<user_id>[0-9]+)/permissions", permission_classes=[IsAuthenticated])
    def staff_permissions(self, request, user_id=None, *args, **kwargs):
        """
        Получает или обновляет флаги разрешений ассистента курса.
        Доступно только автору курса и администратору.

        Args:
            request: DRF request.
            user_id: Идентификатор пользователя-ассистента.
            *args: Позиционные аргументы DRF.
            **kwargs: Именованные аргументы DRF.

        Returns:
            Response: Флаги разрешений ассистента.
        """
        course = self.get_object()
        if not CoursePolicy.can_edit(request.user, course):
            return Response(
                {"detail": "Нет прав на управление ассистентами."}, 
                status=status.HTTP_403_FORBIDDEN,
            )
        staff = get_object_or_404(
            CourseStaff,
            course=course,
            user_id=user_id,
            role=CourseStaffRole.ASSISTANT,
        )
        if request.method == "GET":
            serializer = AssistantPermissionsSerializer(staff)
            return Response(
                serializer.data, 
                status=status.HTTP_200_OK,
            )
        serializer = AssistantPermissionsSerializer(
            staff, 
            data=request.data, 
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            serializer.data, 
            status=status.HTTP_200_OK,
        )
