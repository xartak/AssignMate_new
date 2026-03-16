from django.shortcuts import get_object_or_404
from rest_framework.exceptions import NotFound

from courses.models import Course, Lesson


class CourseContextMixin:
    """Миксин для извлечения курса из URL параметров."""

    def get_course(self):
        """Возвращает курс по course_pk и кэширует его.

        Returns:
            Course: Объект курса.

        Raises:
            NotFound: Если идентификатор курса не передан.
        """
        if hasattr(self, "_course"):
            return self._course

        course_pk = (
            self.kwargs.get("course_pk")
            or self.kwargs.get("course_id")
            or self.kwargs.get("course")
        )
        if course_pk is None:
            raise NotFound("Не передан идентификатор курса.")
        self._course = get_object_or_404(Course.objects, pk=course_pk)
        return self._course


class LessonContextMixin(CourseContextMixin):
    """Миксин для извлечения урока из URL параметров."""

    def _get_lesson_ref(self):
        """Возвращает идентификатор урока из URL-параметров.

        Returns:
            str | int | None: Значение идентификатора урока.
        """
        for key in ("lesson_pk", "lesson_order", "lesson_id"):
            if key in self.kwargs:
                return self.kwargs.get(key)
        # fallback for non-nested routes
        if "order" in self.kwargs and "homework_pk" not in self.kwargs and "homework_order" not in self.kwargs:
            return self.kwargs.get("order")
        return None

    def get_lesson(self):
        """Возвращает урок по order или pk в рамках курса.

        Returns:
            Lesson: Объект урока.

        Raises:
            NotFound: Если идентификатор урока не передан.
        """
        if hasattr(self, "_lesson"):
            return self._lesson

        course = self.get_course()
        lesson_ref = self._get_lesson_ref()
        if lesson_ref is None:
            raise NotFound("Не передан идентификатор урока.")
        try:
            self._lesson = Lesson.objects.get(course=course, order=lesson_ref)
        except Lesson.DoesNotExist:
            self._lesson = get_object_or_404(Lesson.objects, course=course, pk=lesson_ref)
        return self._lesson
