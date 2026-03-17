from __future__ import annotations

from accounts.models import ParentStudent
from courses.choices import CourseStaffRole, EnrollmentStatus
from courses.models.course_staff import CourseStaff
from courses.models.enrollment import Enrollment


def is_authenticated(user) -> bool:
    """Безопасно проверяет аутентификацию пользователя.

    Args:
        user: Пользователь или None.

    Returns:
        bool: True, если пользователь аутентифицирован.
    """
    return bool(user and getattr(user, "is_authenticated", False))


def is_course_assistant(user, course) -> bool:
    """Проверяет, что пользователь ассистент указанного курса.

    Args:
        user: Пользователь.
        course: Курс.

    Returns:
        bool: True, если пользователь ассистент курса.
    """
    if not is_authenticated(user) or not getattr(user, "is_assistant", False):
        return False
    return CourseStaff.objects.filter(
        course=course,
        user=user,
        role=CourseStaffRole.ASSISTANT,
    ).exists()


def is_course_staff(user, course, *, roles: list[str] | tuple[str, ...]) -> bool:
    """Проверяет, что пользователь входит в staff курса с заданной ролью.

    Args:
        user: Пользователь.
        course: Курс.
        roles: Допустимые роли staff.

    Returns:
        bool: True, если пользователь входит в staff с одной из ролей.
    """
    if not is_authenticated(user):
        return False
    return CourseStaff.objects.filter(
        course=course,
        user=user,
        role__in=list(roles),
    ).exists()


def is_student_enrolled(user, course) -> bool:
    """Проверяет активное зачисление студента на курс.

    Args:
        user: Пользователь.
        course: Курс.

    Returns:
        bool: True, если студент зачислен на курс и статус активен.
    """
    if not is_authenticated(user) or not getattr(user, "is_student", False):
        return False
    return Enrollment.objects.filter(
        course=course,
        student=user,
        status=EnrollmentStatus.ACTIVE,
    ).exists()


def is_parent_of_enrolled(user, course) -> bool:
    """Проверяет, что родитель связан со студентом курса.

    Args:
        user: Пользователь.
        course: Курс.

    Returns:
        bool: True, если родитель связан со студентом, зачисленным на курс.
    """
    if not is_authenticated(user) or not getattr(user, "is_parent", False):
        return False
    return ParentStudent.objects.filter(
        parent=user,
        student__enrollments__course=course,
        student__enrollments__status=EnrollmentStatus.ACTIVE,
    ).exists()


class CoursePolicy:
    """Политика доступа к курсам."""

    @staticmethod
    def can_view(user, course) -> bool:
        """Проверяет право просмотра курса.

        Args:
            user: Пользователь.
            course: Курс.

        Returns:
            bool: True, если пользователь может просматривать курс.
        """
        if not is_authenticated(user):
            return False
        return (
            getattr(user, "is_admin", False)
            or course.author_id == user.id
            or is_course_assistant(user, course)
            or is_student_enrolled(user, course)
            or is_parent_of_enrolled(user, course)
        )

    @staticmethod
    def can_create(user) -> bool:
        """Проверяет право создания курса.

        Args:
            user: Пользователь.

        Returns:
            bool: True, если пользователь может создавать курсы.
        """
        return bool(
            is_authenticated(user)
            and (getattr(user, "is_teacher", False) or getattr(user, "is_admin", False))
        )

    @staticmethod
    def can_edit(user, course) -> bool:
        """Проверяет право редактирования курса.

        Args:
            user: Пользователь.
            course: Курс.

        Returns:
            bool: True, если пользователь может редактировать курс.
        """
        return bool(
            is_authenticated(user)
            and (
                getattr(user, "is_admin", False)
                or course.author_id == user.id
            )
        )

    @staticmethod
    def can_delete(user, course) -> bool:
        """Проверяет право удаления курса.

        Args:
            user: Пользователь.
            course: Курс.

        Returns:
            bool: True, если пользователь может удалить курс.
        """
        return bool(
            is_authenticated(user)
            and (getattr(user, "is_admin", False) or course.author_id == user.id)
        )


class LessonPolicy:
    """Политика доступа к урокам."""

    @staticmethod
    def can_view(user, course) -> bool:
        """Проверяет право просмотра уроков курса.

        Args:
            user: Пользователь.
            course: Курс.

        Returns:
            bool: True, если пользователь может просматривать уроки.
        """
        if not is_authenticated(user):
            return False
        if (
            getattr(user, "is_admin", False)
            or course.author_id == user.id
            or is_course_assistant(user, course)
        ):
            return True
        return is_student_enrolled(user, course) or is_parent_of_enrolled(user, course)

    @staticmethod
    def can_create(user, course) -> bool:
        """Проверяет право создания урока в курсе.

        Args:
            user: Пользователь.
            course: Курс.

        Returns:
            bool: True, если пользователь может создавать уроки.
        """
        return bool(
            is_authenticated(user)
            and (getattr(user, "is_admin", False) or course.author_id == user.id)
        )

    @staticmethod
    def can_edit(user, course) -> bool:
        """Проверяет право редактирования урока в курсе.

        Args:
            user: Пользователь.
            course: Курс.

        Returns:
            bool: True, если пользователь может редактировать урок.
        """
        return bool(
            is_authenticated(user)
            and (
                getattr(user, "is_admin", False)
                or course.author_id == user.id
            )
        )

    @staticmethod
    def can_delete(user, course) -> bool:
        """Проверяет право удаления урока из курса.

        Args:
            user: Пользователь.
            course: Курс.

        Returns:
            bool: True, если пользователь может удалить урок.
        """
        return bool(
            is_authenticated(user)
            and (getattr(user, "is_admin", False) or course.author_id == user.id)
        )
