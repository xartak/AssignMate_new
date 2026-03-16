from django.db import transaction

from assignments.models import Review
from assignments.choices import SubmissionStatus
from assignments.policies import SubmissionPolicy


class ReviewSubmissionService:
    """
    Сервис проверки и оценивания домашнего задания.
    """

    def execute(
        self,
        *,
        reviewer,
        submission,
        score: int | None,
        comment: str = "",
        return_for_revision: bool = False,
    ) -> Review | None:
        """Создает или обновляет ревью ответа и фиксирует результат.

        Args:
            reviewer: Пользователь, выполняющий ревью.
            submission: Ответ на задание.
            score: Оценка ответа.
            comment: Комментарий к ревью.
            return_for_revision: Флаг возврата на доработку.

        Returns:
            Review | None: Ревью либо None при возврате на доработку.

        Raises:
            PermissionError: Если пользователь не может выполнять ревью.
        """
        self._check_access(reviewer, submission)

        with transaction.atomic():
            if return_for_revision:
                Review.objects.filter(submission=submission).delete()
                submission.status = SubmissionStatus.REVISION
                submission.save(update_fields=["status"])
                return None

            review, _ = Review.objects.update_or_create(
                submission=submission,
                defaults={
                    "reviewer": reviewer,
                    "score": score,
                    "comment": comment,
                },
            )

            submission.mark_reviewed()

        return review

    def _check_access(self, reviewer, submission):
        """
        Проверять могут администратор, автор курса, преподаватель или ассистент.

        Args:
            reviewer: Пользователь, выполняющий ревью.
            submission: Ответ на задание.

        Raises:
            PermissionError: Если пользователь не имеет прав.
        """
        if not SubmissionPolicy.can_review(reviewer, submission):
            raise PermissionError("User is not allowed to review this submission.")
