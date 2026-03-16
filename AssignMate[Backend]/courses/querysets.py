from django.db import models
from safedelete.managers import SafeDeleteManager, SafeDeleteQueryset

from courses.policies import (
    is_course_assistant,
    is_parent_of_enrolled,
    is_student_enrolled,
)
from courses.choices import CourseStaffRole, EnrollmentStatus


class CourseQuerySet(SafeDeleteQueryset):
    """QuerySet курсов с фильтрацией видимости."""

    def visible_to(self, user):
        """Возвращает курсы, видимые пользователю.

        Args:
            user: Пользователь, для которого формируется выдача.

        Returns:
            SafeDeleteQueryset: QuerySet доступных курсов.
        """
        if not user or not getattr(user, "is_authenticated", False):
            return self.none()
        if getattr(user, "is_admin", False):
            return self.model.all_objects.all()
        query = (
            models.Q(author=user)
            | models.Q(staff__user=user, staff__role=CourseStaffRole.ASSISTANT)
            | models.Q(enrollments__student=user, enrollments__status=EnrollmentStatus.ACTIVE)
        )
        if getattr(user, "is_parent", False):
            query |= models.Q(
                enrollments__student__parent_links__parent=user,
                enrollments__status=EnrollmentStatus.ACTIVE,
            )
        return self.filter(query).distinct()


class CourseManager(SafeDeleteManager.from_queryset(CourseQuerySet)):
    """Менеджер курсов с поддержкой visible_to."""
    pass


class LessonQuerySet(SafeDeleteQueryset):
    """QuerySet уроков с фильтрацией видимости."""

    def visible_to(self, user, course):
        """Возвращает уроки, видимые пользователю в курсе.

        Args:
            user: Пользователь, для которого формируется выдача.
            course: Курс, в рамках которого выбираются уроки.

        Returns:
            SafeDeleteQueryset: QuerySet доступных уроков курса.
        """
        base = self.filter(course=course)
        if not user or not getattr(user, "is_authenticated", False):
            return base.none()
        if getattr(user, "is_admin", False):
            return self.model.all_objects.filter(course=course)
        if course.author_id == user.id or is_course_assistant(user, course):
            return base
        if is_student_enrolled(user, course) or is_parent_of_enrolled(user, course):
            return base
        return base.none()


class LessonManager(SafeDeleteManager.from_queryset(LessonQuerySet)):
    """Менеджер уроков с поддержкой visible_to."""
    pass
