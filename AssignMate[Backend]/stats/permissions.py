from rest_framework import permissions

from courses.policies import CoursePolicy


class CanViewCourseStats(permissions.BasePermission):
    """Разрешение на просмотр статистики курса."""

    def has_permission(self, request, view):
        """Проверяет общий доступ к статистике.

        Args:
            request: DRF request.
            view: DRF view.

        Returns:
            bool: True, если пользователь имеет доступ.
        """
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (
                getattr(user, "is_admin", False)
                or getattr(user, "is_teacher", False)
                or getattr(user, "is_assistant", False)
            )
        )

    def has_object_permission(self, request, view, obj):
        """Проверяет доступ к статистике конкретного курса.

        Args:
            request: DRF request.
            view: DRF view.
            obj: Экземпляр курса.

        Returns:
            bool: True, если доступ разрешен.
        """
        return CoursePolicy.can_edit(request.user, obj)
