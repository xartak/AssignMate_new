from __future__ import annotations

from courses.choices import CourseStaffRole
from accounts.models import ParentStudent
from courses.policies import (
    is_course_staff,
    is_student_enrolled,
    is_authenticated,
)


class SubmissionPolicy:
    """Политики доступа к ответам на задания."""

    @staticmethod
    def can_view(user, submission) -> bool:
        """Проверяет право просмотра конкретного ответа.

        Args:
            user: Пользователь.
            submission: Ответ на задание.

        Returns:
            bool: True, если просмотр разрешен.
        """
        course = submission.assignment.lesson.course
        if getattr(user, "is_admin", False) or course.author_id == getattr(user, "id", None):
            return True
        if is_course_staff(
            user,
            course,
            roles=[CourseStaffRole.TEACHER, CourseStaffRole.ASSISTANT],
        ):
            return True
        if getattr(user, "is_student", False) and submission.student_id == getattr(user, "id", None):
            return True
        if (
            getattr(user, "is_parent", False)
            and ParentStudent.objects.filter(parent=user, student=submission.student).exists()
        ):
            return True
        return False

    @staticmethod
    def can_review(user, submission) -> bool:
        """Проверяет право оставлять ревью на ответ.

        Args:
            user: Пользователь.
            submission: Ответ на задание.

        Returns:
            bool: True, если ревью разрешено.
        """
        course = submission.assignment.lesson.course
        if getattr(user, "is_admin", False) or course.author_id == getattr(user, "id", None):
            return True
        return is_course_staff(
            user,
            course,
            roles=[CourseStaffRole.TEACHER, CourseStaffRole.ASSISTANT],
        )


def filter_submissions_for_user(user, queryset, course):
    """Фильтрует ответы на задания с учетом роли пользователя.

    Args:
        user: Пользователь.
        queryset: Базовый QuerySet ответов.
        course: Курс, к которому относятся задания.

    Returns:
        QuerySet: Отфильтрованный набор ответов.
    """
    if getattr(user, "is_admin", False):
        return queryset
    if course.author_id == getattr(user, "id", None):
        return queryset
    if is_course_staff(
        user,
        course,
        roles=[CourseStaffRole.TEACHER, CourseStaffRole.ASSISTANT],
    ):
        return queryset
    if getattr(user, "is_student", False):
        return queryset.filter(student=user)
    if getattr(user, "is_parent", False):
        return queryset.filter(student__parent_links__parent=user)
    return queryset.none()


class HomeworkPolicy:
    """Политики доступа к домашним заданиям."""

    @staticmethod
    def can_submit(user, course) -> bool:
        """Проверяет, что студент зачислен на курс.

        Args:
            user: Пользователь.
            course: Курс.

        Returns:
            bool: True, если студент может сдавать задания.
        """
        if not (is_authenticated(user) and getattr(user, "is_student", False)):
            return False
        return is_student_enrolled(user, course)
