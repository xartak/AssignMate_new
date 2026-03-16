from django.http import Http404
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import NotFound
from rest_framework.viewsets import ModelViewSet

from courses.permissions import (
    CanCreateLesson,
    CanDeleteLesson,
    CanEditLesson,
    CanReadLesson,
)
from courses.models import Lesson
from courses.mixins import CourseContextMixin
from common.viewsets import ActionPermissionsMixin, ActionSerializerMixin
from courses.serializers import (
    LessonReadSerializer,
    LessonCreateSerializer,
    LessonUpdateSerializer,
)


class LessonViewSet(CourseContextMixin, ActionPermissionsMixin, ActionSerializerMixin, ModelViewSet):
    """
    API endpoint для уроков.

    Methods:
        GET: courses/<int:course_pk>/lessons/
        POST: courses/<int:course_pk>/lessons/
        PATCH: courses/<int:course_pk>/lessons/<int:order>/
        PUT: courses/<int:course_pk>/lessons/<int:order>/
        DELETE: courses/<int:course_pk>/lessons/<int:order>/
    """
    permission_classes = [CanReadLesson]
    serializer_class = LessonReadSerializer
    serializer_action_classes = {
        "create": LessonCreateSerializer,
        "update": LessonUpdateSerializer,
        "partial_update": LessonUpdateSerializer,
    }
    permission_classes_by_action = {
        "list": [CanReadLesson],
        "retrieve": [CanReadLesson],
        "create": [CanCreateLesson],
        "update": [CanEditLesson],
        "partial_update": [CanEditLesson],
        "destroy": [CanDeleteLesson],
    }
    lookup_field = 'order'
    lookup_url_kwarg = 'order'

    def get_queryset(self):
        """
        Метод получает список уроков для конкретного курса.

        Уроки не должны быть помечены как удаленные
        и отсортированы по порядку.

        Returns:
            QuerySet: Список доступных уроков курса.
        """
        course = self.get_course()
        user = self.request.user

        return Lesson.objects.visible_to(user, course).order_by('order')

    def get_object(self):
        """
        Метод переопределяет метод get_object.

        В качестве параметра теперь будет извлекаться порядковый
        номер урока для конкретного курса.

        Returns:
            Lesson: Объект урока.

        Raises:
            NotFound: Если урок не найден в рамках курса.
        """
        queryset = self.get_queryset()
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        filter_kwargs = {self.lookup_field: self.kwargs[lookup_url_kwarg]}

        try:
            obj = get_object_or_404(queryset, **filter_kwargs)
        except Http404:
            raise NotFound(f"Урок с номером {filter_kwargs[self.lookup_field]} не найден в этом курсе")

        self.check_object_permissions(self.request, obj)
        return obj

    def perform_create(self, serializer):
        """Привязывает урок к курсу перед сохранением.

        Args:
            serializer: Сериализатор урока.

        Returns:
            None.
        """
        serializer.save(course=self.get_course())
