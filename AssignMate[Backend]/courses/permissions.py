from rest_framework import permissions

from courses.policies import CoursePolicy, LessonPolicy, is_authenticated


class CanReadCourse(permissions.BasePermission):
    """Разрешение на чтение курсов."""

    def has_permission(self, request, view):
        """Разрешает доступ на уровне запроса.

        Args:
            request: DRF request.
            view: DRF view.

        Returns:
            bool: True, если доступ к списку курсов разрешен.
        """
        return True

    def has_object_permission(self, request, view, obj):
        """Проверяет право просмотра конкретного курса.

        Args:
            request: DRF request.
            view: DRF view.
            obj: Экземпляр курса.

        Returns:
            bool: True, если доступ к курсу разрешен.
        """
        return CoursePolicy.can_view(request.user, obj)


class CanCreateCourse(permissions.BasePermission):
    """Разрешение на создание курсов."""

    def has_permission(self, request, view):
        """Проверяет право создавать курсы.

        Args:
            request: DRF request.
            view: DRF view.

        Returns:
            bool: True, если пользователь может создавать курсы.
        """
        return CoursePolicy.can_create(request.user)


class CanEditCourse(permissions.BasePermission):
    """Разрешение на редактирование курсов."""

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
        """Проверяет право редактировать конкретный курс.

        Args:
            request: DRF request.
            view: DRF view.
            obj: Экземпляр курса.

        Returns:
            bool: True, если пользователь может редактировать курс.
        """
        return CoursePolicy.can_edit(request.user, obj)


class CanDeleteCourse(permissions.BasePermission):
    """Разрешение на удаление курсов."""

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
        """Проверяет право удалять конкретный курс.

        Args:
            request: DRF request.
            view: DRF view.
            obj: Экземпляр курса.

        Returns:
            bool: True, если пользователь может удалять курс.
        """
        return CoursePolicy.can_delete(request.user, obj)


class CanReadLesson(permissions.BasePermission):
    """Разрешение на чтение уроков."""

    def has_permission(self, request, view):
        """Проверяет доступ к списку уроков курса.

        Args:
            request: DRF request.
            view: DRF view.

        Returns:
            bool: True, если пользователь может просматривать уроки.
        """
        course = view.get_course()
        return LessonPolicy.can_view(request.user, course)

    def has_object_permission(self, request, view, obj):
        """Проверяет право просмотра конкретного урока.

        Args:
            request: DRF request.
            view: DRF view.
            obj: Экземпляр урока.

        Returns:
            bool: True, если пользователь может просматривать урок.
        """
        return LessonPolicy.can_view(request.user, obj.course)


class CanCreateLesson(permissions.BasePermission):
    """Разрешение на создание уроков."""

    def has_permission(self, request, view):
        """Проверяет право создавать уроки в курсе.

        Args:
            request: DRF request.
            view: DRF view.

        Returns:
            bool: True, если пользователь может создавать уроки.
        """
        course = view.get_course()
        return LessonPolicy.can_create(request.user, course)


class CanEditLesson(permissions.BasePermission):
    """Разрешение на редактирование уроков."""

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
        """Проверяет право редактировать конкретный урок.

        Args:
            request: DRF request.
            view: DRF view.
            obj: Экземпляр урока.

        Returns:
            bool: True, если пользователь может редактировать урок.
        """
        return LessonPolicy.can_edit(request.user, obj.course)


class CanDeleteLesson(permissions.BasePermission):
    """Разрешение на удаление уроков."""

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
        """Проверяет право удалять конкретный урок.

        Args:
            request: DRF request.
            view: DRF view.
            obj: Экземпляр урока.

        Returns:
            bool: True, если пользователь может удалять урок.
        """
        return LessonPolicy.can_delete(request.user, obj.course)


class CanGenerateInviteCode(permissions.BasePermission):
    """Разрешение на генерацию кода приглашения."""

    def has_permission(self, request, view):
        """Проверяет аутентификацию пользователя.

        Args:
            request: DRF request.
            view: DRF view.

        Returns:
            bool: True, если пользователь аутентифицирован.
        """
        return is_authenticated(request.user)

    def has_object_permission(self, request, view, obj):
        """Проверяет право генерировать код приглашения.

        Args:
            request: DRF request.
            view: DRF view.
            obj: Экземпляр курса.

        Returns:
            bool: True, если пользователь может генерировать код.
        """
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (
                getattr(user, "is_admin", False)
                or obj.author_id == getattr(user, "id", None)
            )
        )


class CanJoinCourse(permissions.BasePermission):
    """Разрешение на присоединение к курсу."""

    def has_permission(self, request, view):
        """Проверяет, что пользователь студент.

        Args:
            request: DRF request.
            view: DRF view.

        Returns:
            bool: True, если пользователь студент и аутентифицирован.
        """
        user = request.user
        return bool(user and user.is_authenticated and getattr(user, "is_student", False))
