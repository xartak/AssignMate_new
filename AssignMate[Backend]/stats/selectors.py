from django.db.models import Count, Sum, Q, Max
from django.db.models.functions import Coalesce
from django.core.exceptions import ObjectDoesNotExist

from courses.choices import EnrollmentStatus, CourseStaffRole
from courses.models import Course, Lesson, Enrollment
from assignments.models import Assignment, Submission
from assignments.choices import SubmissionTimelinessStatus


def courses_for_stats(user):
    """Возвращает курсы, доступные пользователю для статистики.

    Args:
        user: Пользователь.

    Returns:
        QuerySet: Набор курсов, доступных для просмотра статистики.
    """
    if getattr(user, "is_admin", False):
        return Course.all_objects.all()
    if getattr(user, "is_teacher", False):
        return Course.objects.filter(author=user).distinct()
    if getattr(user, "is_assistant", False):
        return Course.objects.filter(
            staff__user=user,
            staff__role=CourseStaffRole.ASSISTANT,
        ).distinct()
    return Course.objects.none()


def course_list_stats(user):
    """Возвращает список курсов с количеством студентов.

    Args:
        user: Пользователь.

    Returns:
        QuerySet: Курсы с аннотацией students_count.
    """
    return courses_for_stats(user).annotate(
        students_count=Count(
            "enrollments",
            filter=Q(enrollments__status=EnrollmentStatus.ACTIVE),
            distinct=True,
        )
    )


def course_detail_stats(course):
    """Собирает агрегированную статистику по курсу.

    Args:
        course: Экземпляр курса.

    Returns:
        dict: Статистические показатели курса.
    """
    students_count = Enrollment.objects.filter(
        course=course,
        status=EnrollmentStatus.ACTIVE,
    ).count()
    lessons_count = Lesson.objects.filter(course=course).count()
    homeworks_count = Assignment.objects.filter(lesson__course=course).count()
    total_max_score = (
        Assignment.objects.filter(lesson__course=course)
        .aggregate(total=Coalesce(Sum("max_score"), 0))
        .get("total")
    )

    return {
        "id": course.id,
        "title": course.title,
        "students_count": students_count,
        "lessons_count": lessons_count,
        "homeworks_count": homeworks_count,
        "total_max_score": total_max_score,
    }


def lesson_list_stats(course):
    """Собирает статистику по урокам курса.

    Args:
        course: Экземпляр курса.

    Returns:
        list[dict]: Список статистики по каждому уроку.
    """
    students_count = Enrollment.objects.filter(
        course=course,
        status=EnrollmentStatus.ACTIVE,
    ).count()

    lessons = (
        Lesson.objects.filter(course=course)
        .annotate(
            homeworks_max_score_sum=Coalesce(Sum("assignments__max_score"), 0),
            score_sum=Coalesce(Sum("assignments__submissions__review__score"), 0),
        )
        .order_by("order")
    )

    results = []
    for lesson in lessons:
        denom = lesson.homeworks_max_score_sum * students_count
        completion_percent_score = (lesson.score_sum / denom * 100) if denom else 0.0
        results.append(
            {
                "id": lesson.id,
                "order": lesson.order,
                "title": lesson.title,
                "homeworks_max_score_sum": lesson.homeworks_max_score_sum,
                "completion_percent_score": round(completion_percent_score, 2),
            }
        )
    return results


def lesson_detail_stats(course, lesson):
    """Собирает детальную статистику по уроку.

    Args:
        course: Экземпляр курса.
        lesson: Экземпляр урока.

    Returns:
        dict: Детальная статистика по уроку.
    """
    students_count = Enrollment.objects.filter(
        course=course,
        status=EnrollmentStatus.ACTIVE,
    ).count()
    homeworks_count = Assignment.objects.filter(lesson=lesson).count()
    total_max_score = (
        Assignment.objects.filter(lesson=lesson)
        .aggregate(total=Coalesce(Sum("max_score"), 0))
        .get("total")
    )

    submissions = Submission.objects.filter(assignment__lesson=lesson)
    submissions_stats = submissions.aggregate(
        submissions_count=Count("id"),
        reviewed_count=Count("review", filter=Q(review__isnull=False)),
        score_sum=Coalesce(Sum("review__score"), 0),
    )
    submissions_count = submissions_stats["submissions_count"]
    reviewed_count = submissions_stats["reviewed_count"]
    score_sum = submissions_stats["score_sum"]

    denom_score = total_max_score * students_count
    completion_percent_score = (score_sum / denom_score * 100) if denom_score else 0.0

    denom_submissions = homeworks_count * students_count
    completion_percent_submissions = (
        submissions_count / denom_submissions * 100
        if denom_submissions
        else 0.0
    )

    avg_score = (score_sum / reviewed_count) if reviewed_count else 0.0

    return {
        "id": lesson.id,
        "order": lesson.order,
        "title": lesson.title,
        "students_count": students_count,
        "homeworks_count": homeworks_count,
        "total_max_score": total_max_score,
        "submissions_count": submissions_count,
        "reviewed_count": reviewed_count,
        "score_sum": score_sum,
        "avg_score": round(avg_score, 2),
        "completion_percent_submissions": round(completion_percent_submissions, 2),
        "completion_percent_score": round(completion_percent_score, 2),
    }


def homework_list_stats(course):
    """Собирает статистику по домашним заданиям курса.

    Args:
        course: Экземпляр курса.

    Returns:
        list[dict]: Список статистики по каждому заданию.
    """
    students_count = Enrollment.objects.filter(
        course=course,
        status=EnrollmentStatus.ACTIVE,
    ).count()

    homeworks = (
        Assignment.objects.filter(lesson__course=course)
        .annotate(
            score_sum=Coalesce(Sum("submissions__review__score"), 0),
            submissions_count=Count("submissions", distinct=True),
            reviewed_count=Count("submissions__review", distinct=True),
        )
        .order_by("lesson__order", "order")
    )

    results = []
    for homework in homeworks:
        denom = homework.max_score * students_count
        completion_percent_score = (homework.score_sum / denom * 100) if denom else 0.0
        results.append(
            {
                "id": homework.id,
                "order": homework.order,
                "title": homework.title,
                "max_score": homework.max_score,
                "submissions_count": homework.submissions_count,
                "reviewed_count": homework.reviewed_count,
                "completion_percent_score": round(completion_percent_score, 2),
            }
        )
    return results


def homework_detail_stats(course, homework):
    """Собирает детальную статистику по домашнему заданию.

    Args:
        course: Экземпляр курса.
        homework: Экземпляр домашнего задания.

    Returns:
        dict: Детальная статистика по заданию.
    """
    students_count = Enrollment.objects.filter(
        course=course,
        status=EnrollmentStatus.ACTIVE,
    ).count()

    submissions = Submission.objects.filter(assignment=homework).select_related(
        "student",
        "review",
    )
    submissions_stats = submissions.aggregate(
        score_sum=Coalesce(Sum("review__score"), 0),
        submissions_count=Count("id"),
        reviewed_count=Count("review", filter=Q(review__isnull=False)),
    )
    score_sum = submissions_stats["score_sum"]
    submissions_count = submissions_stats["submissions_count"]
    reviewed_count = submissions_stats["reviewed_count"]

    denom = homework.max_score * students_count
    completion_percent_score = (score_sum / denom * 100) if denom else 0.0

    score_by_student = {}
    has_submission = set()
    for submission in submissions:
        has_submission.add(submission.student_id)
        score_by_student[submission.student_id] = submission.review.score if submission.review else 0

    students = (
        Enrollment.objects.filter(course=course, status=EnrollmentStatus.ACTIVE)
        .select_related("student")
        .order_by("student__last_name", "student__first_name")
    )

    students_stats = []
    for enrollment in students:
        student = enrollment.student
        score = score_by_student.get(student.id, 0)
        percent = (score / homework.max_score * 100) if homework.max_score else 0.0
        students_stats.append(
            {
                "student_id": student.id,
                "email": student.email,
                "first_name": student.first_name or "",
                "last_name": student.last_name or "",
                "score": score,
                "percent": round(percent, 2),
                "has_submission": student.id in has_submission,
            }
        )

    return {
        "id": homework.id,
        "order": homework.order,
        "title": homework.title,
        "max_score": homework.max_score,
        "students_count": students_count,
        "submissions_count": submissions_count,
        "reviewed_count": reviewed_count,
        "score_sum": score_sum,
        "completion_percent_score": round(completion_percent_score, 2),
        "students": students_stats,
    }


def course_students_stats(course):
    """Собирает статистику по студентам курса.

    Args:
        course: Экземпляр курса.

    Returns:
        list[dict]: Список статистики по студентам.
    """
    homeworks_count = Assignment.objects.filter(lesson__course=course).count()
    total_max_score = (
        Assignment.objects.filter(lesson__course=course)
        .aggregate(total=Coalesce(Sum("max_score"), 0))
        .get("total")
    )

    assignment_filter = Q(
        student__submissions__assignment__lesson__course=course,
        student__submissions__assignment__deleted__isnull=True,
    )

    enrollments = (
        Enrollment.objects.filter(course=course, status=EnrollmentStatus.ACTIVE)
        .select_related("student")
        .annotate(
            submissions_count=Count("student__submissions", filter=assignment_filter, distinct=True),
            reviewed_count=Count(
                "student__submissions__review",
                filter=assignment_filter & Q(student__submissions__review__isnull=False),
                distinct=True,
            ),
            score_sum=Coalesce(Sum("student__submissions__review__score", filter=assignment_filter), 0),
            last_submission_at=Max("student__submissions__created_at", filter=assignment_filter),
        )
        .order_by("student__last_name", "student__first_name")
    )

    results = []
    for enrollment in enrollments:
        student = enrollment.student
        completion_percent_score = (
            enrollment.score_sum / total_max_score * 100
            if total_max_score
            else 0.0
        )
        completion_percent_submissions = (
            enrollment.submissions_count / homeworks_count * 100
            if homeworks_count
            else 0.0
        )

        results.append(
            {
                "student_id": student.id,
                "email": student.email,
                "first_name": student.first_name or "",
                "last_name": student.last_name or "",
                "submissions_count": enrollment.submissions_count,
                "reviewed_count": enrollment.reviewed_count,
                "score_sum": enrollment.score_sum,
                "completion_percent_score": round(completion_percent_score, 2),
                "completion_percent_submissions": round(completion_percent_submissions, 2),
                "last_submission_at": enrollment.last_submission_at,
            }
        )

    return results


def course_student_detail_stats(course, student):
    """Собирает детальную статистику по конкретному студенту курса.

    Args:
        course: Экземпляр курса.
        student: Пользователь-студент.

    Returns:
        dict: Детальная статистика по студенту.
    """
    homeworks = (
        Assignment.objects.filter(lesson__course=course)
        .select_related("lesson")
        .order_by("lesson__order", "order")
    )
    homeworks_count = homeworks.count()
    total_max_score = homeworks.aggregate(total=Coalesce(Sum("max_score"), 0)).get("total")

    submissions = (
        Submission.objects.filter(student=student, assignment__lesson__course=course)
        .select_related("review", "assignment", "assignment__lesson")
    )
    submissions_count = submissions.count()
    on_time_count = submissions.filter(
        timeliness_status=SubmissionTimelinessStatus.ON_TIME
    ).count()
    score_sum = submissions.aggregate(total=Coalesce(Sum("review__score"), 0)).get("total")

    submissions_by_assignment = {submission.assignment_id: submission for submission in submissions}

    homeworks_stats = []
    for homework in homeworks:
        submission = submissions_by_assignment.get(homework.id)
        if submission:
            status = submission.status
            try:
                review = submission.review
            except ObjectDoesNotExist:
                review = None
            score = review.score if review else None
        else:
            status = "NOT_SUBMITTED"
            score = None

        homeworks_stats.append(
            {
                "homework_id": homework.id,
                "lesson_order": homework.lesson.order,
                "lesson_title": homework.lesson.title,
                "title": homework.title,
                "deadline": homework.deadline,
                "status": status,
                "score": score,
            }
        )

    return {
        "course_id": course.id,
        "course_title": course.title,
        "student_id": student.id,
        "email": student.email,
        "first_name": student.first_name or "",
        "last_name": student.last_name or "",
        "homeworks_count": homeworks_count,
        "total_max_score": total_max_score,
        "submissions_count": submissions_count,
        "score_sum": score_sum,
        "on_time_count": on_time_count,
        "homeworks": homeworks_stats,
    }
