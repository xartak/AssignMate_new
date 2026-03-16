from django.db import transaction
from django.utils import timezone

from assignments.models import (
    Submission,
    SubmissionFile,
    Review,
    SingleChoiceSubmission,
    MultipleChoiceSubmission,
    FillBlankSubmission,
    FillBlankAnswer,
    ShortAnswerSubmission,
    LongAnswerSubmission,
)
from assignments.choices import SubmissionStatus, SubmissionTimelinessStatus, AssignmentType
from assignments.services.validators import validate_submission_data
from assignments.policies import HomeworkPolicy


class SubmitAssignmentService:
    """
    Сервис сдачи домашнего задания студентом.
    """

    def execute(self, *, student, assignment, data: dict) -> Submission:
        """Создает или обновляет ответ и сохраняет связанные данные.

        Args:
            student: Пользователь-студент.
            assignment: Домашнее задание.
            data: Валидированные данные ответа.

        Returns:
            Submission: Созданный или обновленный ответ.

        Raises:
            PermissionError: Если студент не имеет права сдавать задание.
            AssignmentValidationError: Если данные ответа некорректны.
            ValueError: Если тип задания не поддерживается.
        """
        self._check_access(student, assignment)
        validate_submission_data(assignment, data)

        with transaction.atomic():
            submission = (
                Submission.objects
                .select_for_update()
                .filter(assignment=assignment, student=student)
                .first()
            )
            if submission and submission.status != SubmissionStatus.REVISION:
                raise ValueError("Submission already exists.")

            deadline = assignment.deadline
            if deadline and timezone.now() > deadline:
                timeliness_status = SubmissionTimelinessStatus.LATE
            else:
                timeliness_status = SubmissionTimelinessStatus.ON_TIME

            if submission is None:
                submission = Submission.objects.create(
                    assignment=assignment,
                    student=student,
                    status=SubmissionStatus.PENDING,
                    timeliness_status=timeliness_status,
                )
            else:
                submission.status = SubmissionStatus.PENDING
                submission.timeliness_status = timeliness_status
                submission.save(update_fields=["status", "timeliness_status"])
                Review.objects.filter(submission=submission).delete()

            if assignment.type == AssignmentType.SINGLE_CHOICE:
                SingleChoiceSubmission.objects.update_or_create(
                    submission=submission,
                    defaults={"selected_option": data["selected_option"]},
                )

            elif assignment.type == AssignmentType.MULTIPLE_CHOICE:
                detail, _ = MultipleChoiceSubmission.objects.get_or_create(
                    submission=submission,
                )
                detail.selected_options.set(data["selected_options"])

            elif assignment.type == AssignmentType.FILL_BLANK:
                detail, _ = FillBlankSubmission.objects.get_or_create(
                    submission=submission,
                )
                detail.answers.all().delete()
                answers = [
                    FillBlankAnswer(
                        submission=detail,
                        position=item["position"],
                        answer_text=item["answer_text"],
                    )
                    for item in data["answers"]
                ]
                if answers:
                    FillBlankAnswer.objects.bulk_create(answers)

            elif assignment.type == AssignmentType.SHORT_ANSWER:
                ShortAnswerSubmission.objects.update_or_create(
                    submission=submission,
                    defaults={"answer_text": data["answer_text"]},
                )

            elif assignment.type == AssignmentType.LONG_ANSWER:
                LongAnswerSubmission.objects.update_or_create(
                    submission=submission,
                    defaults={"answer_text": data["answer_text"]},
                )
                if "files" in data:
                    submission.files.all().delete()
                    files = [
                        SubmissionFile(
                            submission=submission,
                            file=file,
                        )
                        for file in data["files"]
                    ]
                    if files:
                        SubmissionFile.objects.bulk_create(files)
            else:
                raise ValueError("Unsupported assignment type.")

        return submission

    def _check_access(self, student, assignment):
        """
        Студент должен быть зачислен на курс и иметь активный статус.

        Args:
            student: Пользователь-студент.
            assignment: Домашнее задание.

        Raises:
            PermissionError: Если студент не может сдавать задание.
        """
        course = assignment.lesson.course

        if not HomeworkPolicy.can_submit(student, course):
            raise PermissionError("Student is not enrolled in this course.")
