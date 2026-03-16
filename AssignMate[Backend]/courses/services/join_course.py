from courses.choices import EnrollmentStatus
from courses.models import Enrollment
from courses.services.exceptions import AlreadyEnrolledError


def join_course(*, student, course) -> tuple[Enrollment, bool]:
    """Присоединяет студента к курсу или активирует отчисленного.

    Args:
        student: Пользователь-студент.
        course: Курс, к которому выполняется присоединение.

    Returns:
        tuple[Enrollment, bool]: Запись зачисления и флаг создания.

    Raises:
        AlreadyEnrolledError: Если студент уже зачислен и активен.
    """
    enrollment, created = Enrollment.objects.get_or_create(
        student=student,
        course=course,
        defaults={"status": EnrollmentStatus.ACTIVE},
    )
    if created:
        return enrollment, True

    if enrollment.status == EnrollmentStatus.EXPELLED:
        enrollment.status = EnrollmentStatus.ACTIVE
        enrollment.save(update_fields=["status"])
        return enrollment, False

    raise AlreadyEnrolledError("Вы уже зачислены на этот курс.")
