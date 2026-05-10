from django.shortcuts import get_object_or_404
from rest_framework import permissions
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import ParentStudent
from assignments.models import Assignment
from courses.models import Course, Lesson
from stats.permissions import CanViewCourseStats
from stats.selectors import (
    course_list_stats,
    course_detail_stats,
    lesson_list_stats,
    lesson_detail_stats,
    homework_list_stats,
    homework_detail_stats,
    course_students_stats,
    course_student_detail_stats,
)
from stats.serializers import (
    CourseStatsListSerializer,
    CourseStatsDetailSerializer,
    LessonStatsListSerializer,
    LessonStatsDetailSerializer,
    HomeworkStatsListSerializer,
    HomeworkStatsDetailSerializer,
    CourseStudentStatsSerializer,
    CourseStudentDetailSerializer,
)
from courses.choices import EnrollmentStatus
from courses.models import Enrollment


def _course_queryset_for_user(user):
    """Возвращает queryset курсов с учетом роли пользователя."""
    return Course.all_objects if getattr(user, "is_admin", False) else Course.objects


def _lesson_queryset_for_user(user):
    """Возвращает queryset уроков с учетом роли пользователя."""
    base = Lesson.all_objects if getattr(user, "is_admin", False) else Lesson.objects
    return base.filter(deleted__isnull=True)


def _assignment_queryset_for_user(user):
    """Возвращает queryset заданий с учетом роли пользователя."""
    base = Assignment.all_objects if getattr(user, "is_admin", False) else Assignment.objects
    return base.filter(deleted__isnull=True)


class CourseStatsListView(ListAPIView):
    """Список курсов с количеством учеников."""
    permission_classes = [CanViewCourseStats]
    serializer_class = CourseStatsListSerializer

    def get_queryset(self):
        """Возвращает список курсов для статистики.

        Returns:
            QuerySet: Курсы, доступные текущему пользователю.
        """
        return course_list_stats(self.request.user)


class CourseStatsDetailView(APIView):
    """Статистика по конкретному курсу."""
    permission_classes = [CanViewCourseStats]

    def get(self, request, course_id: int):
        """Возвращает агрегированную статистику курса.

        Args:
            request: DRF request.
            course_id: Идентификатор курса.

        Returns:
            Response: Сериализованная статистика курса.
        """
        course = get_object_or_404(_course_queryset_for_user(request.user), pk=course_id)
        self.check_object_permissions(request, course)
        data = course_detail_stats(course)
        serializer = CourseStatsDetailSerializer(data)
        return Response(serializer.data)


class LessonStatsListView(APIView):
    """Статистика по урокам курса."""
    permission_classes = [CanViewCourseStats]

    def get(self, request, course_id: int):
        """Возвращает список статистики по урокам курса.

        Args:
            request: DRF request.
            course_id: Идентификатор курса.

        Returns:
            Response: Список статистики по урокам.
        """
        course = get_object_or_404(_course_queryset_for_user(request.user), pk=course_id)
        self.check_object_permissions(request, course)
        data = lesson_list_stats(course)
        serializer = LessonStatsListSerializer(data, many=True)
        return Response(serializer.data)


class LessonStatsDetailView(APIView):
    """Статистика по конкретному уроку."""
    permission_classes = [CanViewCourseStats]

    def get(self, request, course_id: int, lesson_order: int):
        """Возвращает статистику по конкретному уроку.

        Args:
            request: DRF request.
            course_id: Идентификатор курса.
            lesson_order: Порядковый номер урока.

        Returns:
            Response: Сериализованная статистика урока.
        """
        course = get_object_or_404(_course_queryset_for_user(request.user), pk=course_id)
        self.check_object_permissions(request, course)
        lesson = get_object_or_404(
            _lesson_queryset_for_user(request.user),
            course=course,
            order=lesson_order,
        )
        data = lesson_detail_stats(course, lesson)
        serializer = LessonStatsDetailSerializer(data)
        return Response(serializer.data)


class HomeworkStatsListView(APIView):
    """Статистика по домашним заданиям курса."""
    permission_classes = [CanViewCourseStats]

    def get(self, request, course_id: int):
        """Возвращает список статистики по заданиям курса.

        Args:
            request: DRF request.
            course_id: Идентификатор курса.

        Returns:
            Response: Список статистики по заданиям.
        """
        course = get_object_or_404(_course_queryset_for_user(request.user), pk=course_id)
        self.check_object_permissions(request, course)
        data = homework_list_stats(course)
        serializer = HomeworkStatsListSerializer(data, many=True)
        return Response(serializer.data)


class HomeworkStatsDetailView(APIView):
    """Статистика по конкретному домашнему заданию."""
    permission_classes = [CanViewCourseStats]

    def get(self, request, course_id: int, homework_order: int):
        """Возвращает статистику по конкретному заданию.

        Args:
            request: DRF request.
            course_id: Идентификатор курса.
            homework_order: Порядковый номер домашнего задания.

        Returns:
            Response: Сериализованная статистика задания.
        """
        course = get_object_or_404(_course_queryset_for_user(request.user), pk=course_id)
        self.check_object_permissions(request, course)
        homework = get_object_or_404(
            _assignment_queryset_for_user(request.user),
            lesson__course=course,
            order=homework_order,
        )
        data = homework_detail_stats(course, homework)
        serializer = HomeworkStatsDetailSerializer(data)
        return Response(serializer.data)


class CourseStudentsStatsView(APIView):
    """Статистика по студентам курса."""
    permission_classes = [CanViewCourseStats]

    def get(self, request, course_id: int):
        """Возвращает статистику по студентам курса.

        Args:
            request: DRF request.
            course_id: Идентификатор курса.

        Returns:
            Response: Список статистики по студентам.
        """
        course = get_object_or_404(_course_queryset_for_user(request.user), pk=course_id)
        self.check_object_permissions(request, course)
        data = course_students_stats(course)
        serializer = CourseStudentStatsSerializer(data, many=True)
        return Response(serializer.data)


class CourseStudentDetailView(APIView):
    """Статистика по конкретному студенту курса."""
    permission_classes = [CanViewCourseStats]

    def get(self, request, course_id: int, student_id: int):
        """Возвращает статистику по конкретному студенту курса.

        Args:
            request: DRF request.
            course_id: Идентификатор курса.
            student_id: Идентификатор студента.

        Returns:
            Response: Детальная статистика по студенту.
        """
        course = get_object_or_404(_course_queryset_for_user(request.user), pk=course_id)
        self.check_object_permissions(request, course)
        enrollment = get_object_or_404(
            Enrollment.objects.select_related("student"),
            course=course,
            student_id=student_id,
            status=EnrollmentStatus.ACTIVE,
        )
        data = course_student_detail_stats(course, enrollment.student)
        serializer = CourseStudentDetailSerializer(data)
        return Response(serializer.data)


class StudentSelfStatsView(APIView):
    """Статистика студента/родителя по курсу для себя."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, course_id: int):
        """Возвращает статистику текущего пользователя (студент) или ребёнка (родитель).

        Args:
            request: DRF request.
            course_id: Идентификатор курса.

        Returns:
            Response: Детальная статистика по студенту.
        """
        user = request.user
        course = get_object_or_404(
            Course.objects, 
            pk=course_id,
        )

        if getattr(user, "is_student", False):
            get_object_or_404(
                Enrollment,
                course=course,
                student=user,
                status=EnrollmentStatus.ACTIVE,
            )
            student = user
        elif getattr(user, "is_parent", False):
            student_id = request.query_params.get("student_id")
            if student_id:
                link = get_object_or_404(
                    ParentStudent,
                    parent=user,
                    student_id=student_id,
                )
                get_object_or_404(
                    Enrollment,
                    course=course,
                    student=link.student,
                    status=EnrollmentStatus.ACTIVE,
                )
                student = link.student
            else:
                link = ParentStudent.objects.filter(
                    parent=user,
                    student__enrollments__course=course,
                    student__enrollments__status=EnrollmentStatus.ACTIVE,
                ).select_related("student").first()
                if not link:
                    return Response(
                        {"detail": "Ребёнок не зачислен на этот курс."}, 
                        status=status.HTTP_404_NOT_FOUND)
                student = link.student
        else:
            return Response(
                {"detail": "Нет доступа."}, 
                status=status.HTTP_403_FORBIDDEN)

        data = course_student_detail_stats(course, student)
        serializer = CourseStudentDetailSerializer(data)
        return Response(serializer.data)
