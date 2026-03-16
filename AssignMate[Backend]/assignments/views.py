from django.http import Http404
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from assignments.models import Assignment, Submission
from assignments.serializers import (
    HomeworkReadSerializer,
    HomeworkCreateSerializer,
    HomeworkUpdateSerializer,
    SubmissionReadSerializer,
    SUBMISSION_CREATE_SERIALIZERS,
    ReviewCreateSerializer,
)
from assignments.services import SubmitAssignmentService, ReviewSubmissionService
from assignments.services.validators import AssignmentValidationError
from assignments.mixins import HomeworkContextMixin
from assignments.policies import filter_submissions_for_user
from assignments.permissions import (
    CanReadHomework,
    CanCreateHomework,
    CanEditHomework,
    CanDeleteHomework,
    CanReadSubmission,
    CanSubmitHomework,
    CanReviewSubmission,
)
from common.viewsets import ActionPermissionsMixin, ActionSerializerMixin


class HomeworkViewSet(HomeworkContextMixin, ActionPermissionsMixin, ActionSerializerMixin, ModelViewSet):
    """
    API endpoint для домашних заданий.

    Methods:
        GET: courses/<int:course_pk>/lessons/<int:order>/homeworks/
        POST: courses/<int:course_pk>/lessons/<int:order>/homeworks/
        PATCH: courses/<int:course_pk>/lessons/<int:order>/homeworks/<int:homework_order>/
        PUT: courses/<int:course_pk>/lessons/<int:order>/homeworks/<int:homework_order>/
        DELETE: courses/<int:course_pk>/lessons/<int:order>/homeworks/<int:homework_order>/
    """
    lookup_field = "order"
    lookup_url_kwarg = "order"
    permission_classes = [CanReadHomework]
    serializer_class = HomeworkReadSerializer
    serializer_action_classes = {
        "create": HomeworkCreateSerializer,
        "update": HomeworkUpdateSerializer,
        "partial_update": HomeworkUpdateSerializer,
    }
    permission_classes_by_action = {
        "list": [CanReadHomework],
        "retrieve": [CanReadHomework],
        "create": [CanCreateHomework],
        "update": [CanEditHomework],
        "partial_update": [CanEditHomework],
        "destroy": [CanDeleteHomework],
    }

    def get_queryset(self):
        """
        Возвращает список домашних заданий для урока.

        Returns:
            QuerySet: Список заданий урока.
        """
        lesson = self.get_lesson()
        user = self.request.user

        if getattr(user, "is_admin", False):
            queryset = Assignment.all_objects.filter(lesson=lesson)
        else:
            queryset = Assignment.objects.filter(lesson=lesson)

        return (
            queryset
            .select_related(
                "single_choice",
                "multiple_choice",
                "fill_blank",
                "short_answer",
                "long_answer",
            )
            .prefetch_related(
                "options",
                "fill_blank__blanks",
            )
            .order_by("order")
        )

    def get_object(self):
        """
        Возвращает домашнее задание по порядковому номеру.

        Returns:
            Assignment: Экземпляр задания.

        Raises:
            NotFound: Если задание не найдено.
        """
        queryset = self.get_queryset()
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        filter_kwargs = {self.lookup_field: self.kwargs[lookup_url_kwarg]}

        try:
            obj = get_object_or_404(queryset, **filter_kwargs)
        except Http404:
            raise NotFound(
                f"Домашнее задание с номером {filter_kwargs[self.lookup_field]} не найдено"
            )

        self.check_object_permissions(self.request, obj)
        return obj

    def get_serializer_context(self):
        """
        Добавляет данные урока в контекст сериализатора.

        Returns:
            dict: Контекст сериализатора.
        """
        context = super().get_serializer_context()
        context["lesson"] = self.get_lesson()
        return context

    def perform_create(self, serializer):
        """
        Привязывает домашнее задание к уроку перед сохранением.

        Args:
            serializer: Сериализатор домашнего задания.

        Returns:
            None.
        """
        serializer.save(lesson=self.get_lesson())


class SubmissionViewSet(HomeworkContextMixin, ActionPermissionsMixin, ActionSerializerMixin, ModelViewSet):
    """
    API endpoint для ответов на домашние задания.
    """
    http_method_names = ["get", "post", "head", "options"]
    permission_classes = [CanReadSubmission]
    serializer_class = SubmissionReadSerializer
    serializer_action_classes = {
        "review": ReviewCreateSerializer,
    }
    permission_classes_by_action = {
        "list": [CanReadSubmission],
        "retrieve": [CanReadSubmission],
        "create": [CanSubmitHomework],
        "review": [CanReviewSubmission],
    }

    def get_queryset(self):
        """
        Возвращает ответы на конкретное домашнее задание.

        Returns:
            QuerySet: Список ответов на задание.
        """
        homework = self.get_homework()
        course = homework.lesson.course
        user = self.request.user
        queryset = (
            Submission.objects
            .filter(assignment=homework)
            .select_related(
                "assignment",
                "student",
                "review",
                "single_choice",
                "multiple_choice",
                "fill_blank",
                "short_answer",
                "long_answer",
            )
            .select_related(
                "single_choice__selected_option",
            )
            .prefetch_related(
                "files",
                "multiple_choice__selected_options",
                "fill_blank__answers",
            )
        )

        return filter_submissions_for_user(user, queryset, course)

    def create(self, request, *args, **kwargs):
        """
        Создает или обновляет ответ студента на домашнее задание.

        Args:
            request: DRF request с данными ответа.
            *args: Позиционные аргументы DRF.
            **kwargs: Именованные аргументы DRF.

        Returns:
            Response: Сериализованный ответ студента.

        Raises:
            ValidationError: При ошибках в данных или типе задания.
            PermissionDenied: При отсутствии прав.
        """
        homework = self.get_homework()
        serializer_class = SUBMISSION_CREATE_SERIALIZERS.get(homework.type)
        if serializer_class is None:
            raise ValidationError("Unsupported assignment type.")
        serializer = serializer_class(
            data=request.data,
            context={"assignment": homework},
        )
        serializer.is_valid(raise_exception=True)

        try:
            submission = SubmitAssignmentService().execute(
                student=request.user,
                assignment=homework,
                data=serializer.validated_data,
            )
        except PermissionError as exc:
            raise PermissionDenied(str(exc))
        except AssignmentValidationError as exc:
            raise ValidationError(str(exc))
        except ValueError as exc:
            raise ValidationError(str(exc))

        output_serializer = SubmissionReadSerializer(submission)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)

    def get_serializer_class(self):
        """Возвращает сериализатор для текущего action.

        Returns:
            type: Класс сериализатора.

        Raises:
            ValidationError: Если тип задания не поддерживается.
        """
        if self.action == "create":
            assignment = self.get_homework()
            serializer_class = SUBMISSION_CREATE_SERIALIZERS.get(assignment.type)
            if serializer_class is None:
                raise ValidationError("Unsupported assignment type.")
            return serializer_class
        return super().get_serializer_class()

    @action(detail=True, methods=["post"], url_path="review")
    def review(self, request, *args, **kwargs):
        """
        Создает или обновляет ревью на ответ студента.

        Args:
            request: DRF request с данными ревью.
            *args: Позиционные аргументы DRF.
            **kwargs: Именованные аргументы DRF.

        Returns:
            Response: Обновленные данные ответа.

        Raises:
            PermissionDenied: Если нет прав на ревью.
        """
        submission = self.get_object()
        serializer = ReviewCreateSerializer(
            data=request.data,
            context={"assignment": submission.assignment},
        )
        serializer.is_valid(raise_exception=True)

        try:
            ReviewSubmissionService().execute(
                reviewer=request.user,
                submission=submission,
                score=serializer.validated_data.get("score"),
                comment=serializer.validated_data.get("comment", ""),
                return_for_revision=serializer.validated_data.get("return_for_revision", False),
            )
        except PermissionError as exc:
            raise PermissionDenied(str(exc))

        submission.refresh_from_db()
        output_serializer = SubmissionReadSerializer(submission)
        return Response(output_serializer.data, status=status.HTTP_200_OK)
