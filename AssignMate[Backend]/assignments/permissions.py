from rest_framework import permissions

from assignments.policies import HomeworkPolicy, SubmissionPolicy
from courses.policies import LessonPolicy, is_authenticated


class CanReadHomework(permissions.BasePermission):
    """Разрешение на чтение домашних заданий."""

    def has_permission(self, request, view):
        """Проверяет доступ к списку домашних заданий.

        Args:
            request: DRF request.
            view: DRF view.

        Returns:
            bool: True, если доступ разрешен.
        """
        course = view.get_course()
        return LessonPolicy.can_view(request.user, course)

    def has_object_permission(self, request, view, obj):
        """Проверяет право просмотра конкретного задания.

        Args:
            request: DRF request.
            view: DRF view.
            obj: Экземпляр задания.

        Returns:
            bool: True, если доступ к заданию разрешен.
        """
        return LessonPolicy.can_view(request.user, obj.lesson.course)


class CanCreateHomework(permissions.BasePermission):
    """Разрешение на создание домашних заданий."""

    def has_permission(self, request, view):
        """Проверяет право создавать задания в курсе.

        Args:
            request: DRF request.
            view: DRF view.

        Returns:
            bool: True, если создание разрешено.
        """
        course = view.get_course()
        return LessonPolicy.can_edit(request.user, course)


class CanEditHomework(permissions.BasePermission):
    """Разрешение на редактирование домашних заданий."""

    def has_permission(self, request, view):
        """Проверяет аутентификацию для редактирования.

        Args:
            request: DRF request.
            view: DRF view.

        Returns:
            bool: True, если пользователь аутентифицирован.
        """
        return is_authenticated(request.user)

    def has_object_permission(self, request, view, obj):
        """Проверяет право редактировать конкретное задание.

        Args:
            request: DRF request.
            view: DRF view.
            obj: Экземпляр задания.

        Returns:
            bool: True, если редактирование разрешено.
        """
        return LessonPolicy.can_edit(request.user, obj.lesson.course)


class CanDeleteHomework(permissions.BasePermission):
    """Разрешение на удаление домашних заданий."""

    def has_permission(self, request, view):
        """Проверяет аутентификацию для удаления.

        Args:
            request: DRF request.
            view: DRF view.

        Returns:
            bool: True, если пользователь аутентифицирован.
        """
        return is_authenticated(request.user)

    def has_object_permission(self, request, view, obj):
        """Проверяет право удалять конкретное задание.

        Args:
            request: DRF request.
            view: DRF view.
            obj: Экземпляр задания.

        Returns:
            bool: True, если удаление разрешено.
        """
        return LessonPolicy.can_delete(request.user, obj.lesson.course)


class CanSubmitHomework(permissions.BasePermission):
    """Разрешение на отправку ответа на задание."""

    def has_permission(self, request, view):
        """Проверяет, что студент зачислен на курс.

        Args:
            request: DRF request.
            view: DRF view.

        Returns:
            bool: True, если студент может сдавать задания.
        """
        course = view.get_course()
        return HomeworkPolicy.can_submit(request.user, course)


class CanReadSubmission(permissions.BasePermission):
    """Разрешение на чтение ответов на задания."""

    def has_permission(self, request, view):
        """Разрешает доступ только аутентифицированным пользователям.

        Args:
            request: DRF request.
            view: DRF view.

        Returns:
            bool: True, если пользователь аутентифицирован.
        """
        return is_authenticated(request.user)

    def has_object_permission(self, request, view, obj):
        """Проверяет право просмотра конкретного ответа.

        Args:
            request: DRF request.
            view: DRF view.
            obj: Экземпляр ответа.

        Returns:
            bool: True, если просмотр разрешен.
        """
        return SubmissionPolicy.can_view(request.user, obj)


class CanReviewSubmission(permissions.BasePermission):
    """Разрешение на ревью ответов студентов."""

    def has_permission(self, request, view):
        """Проверяет аутентификацию для ревью.

        Args:
            request: DRF request.
            view: DRF view.

        Returns:
            bool: True, если пользователь аутентифицирован.
        """
        return is_authenticated(request.user)

    def has_object_permission(self, request, view, obj):
        """Проверяет право оставлять ревью на ответ.

        Args:
            request: DRF request.
            view: DRF view.
            obj: Экземпляр ответа.

        Returns:
            bool: True, если ревью разрешено.
        """
        return SubmissionPolicy.can_review(request.user, obj)
