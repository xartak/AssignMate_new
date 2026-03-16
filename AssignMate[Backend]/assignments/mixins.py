from django.shortcuts import get_object_or_404
from rest_framework.exceptions import NotFound

from assignments.models import Assignment
from courses.mixins import LessonContextMixin


class HomeworkContextMixin(LessonContextMixin):
    """Миксин для извлечения домашнего задания из URL параметров."""

    def _get_homework_ref(self):
        """Возвращает идентификатор домашнего задания из URL-параметров.

        Returns:
            str | int | None: Значение идентификатора задания.
        """
        for key in ("homework_pk", "homework_order", "homework_id"):
            if key in self.kwargs:
                return self.kwargs.get(key)
        if "order" in self.kwargs:
            return self.kwargs.get("order")
        if "pk" in self.kwargs:
            return self.kwargs.get("pk")
        return None

    def get_homework(self):
        """Возвращает домашнее задание по order или pk.

        Returns:
            Assignment: Экземпляр домашнего задания.

        Raises:
            NotFound: Если идентификатор задания не передан.
        """
        if hasattr(self, "_homework"):
            return self._homework

        lesson = self.get_lesson()
        homework_ref = self._get_homework_ref()
        if homework_ref is None:
            raise NotFound("Не передан идентификатор домашнего задания.")
        try:
            self._homework = Assignment.objects.get(lesson=lesson, order=homework_ref)
        except Assignment.DoesNotExist:
            self._homework = get_object_or_404(Assignment.objects, lesson=lesson, pk=homework_ref)
        return self._homework
