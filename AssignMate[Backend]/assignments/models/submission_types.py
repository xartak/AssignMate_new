from django.db import models


class SingleChoiceSubmission(models.Model):
    """Ответ на задание с выбором одного варианта.

    Attributes:
        submission: Ссылка на ответ.
        selected_option: Выбранный вариант ответа.
    """
    submission = models.OneToOneField(
        "assignments.Submission",
        on_delete=models.CASCADE,
        related_name="single_choice",
    )
    selected_option = models.ForeignKey(
        "assignments.QuestionOption",
        on_delete=models.CASCADE,
        related_name="single_choice_submissions",
    )

    class Meta:
        """Метаданные ответа типа single choice."""
        verbose_name = "Single choice submission"
        verbose_name_plural = "Single choice submissions"


class MultipleChoiceSubmission(models.Model):
    """Ответ на задание с выбором нескольких вариантов.

    Attributes:
        submission: Ссылка на ответ.
        selected_options: Набор выбранных вариантов.
    """
    submission = models.OneToOneField(
        "assignments.Submission",
        on_delete=models.CASCADE,
        related_name="multiple_choice",
    )
    selected_options = models.ManyToManyField(
        "assignments.QuestionOption",
        related_name="multiple_choice_submissions",
        blank=True,
    )

    class Meta:
        """Метаданные ответа типа multiple choice."""
        verbose_name = "Multiple choice submission"
        verbose_name_plural = "Multiple choice submissions"


class FillBlankSubmission(models.Model):
    """Ответ на задание с пропусками.

    Attributes:
        submission: Ссылка на ответ.
    """
    submission = models.OneToOneField(
        "assignments.Submission",
        on_delete=models.CASCADE,
        related_name="fill_blank",
    )

    class Meta:
        """Метаданные ответа типа fill blank."""
        verbose_name = "Fill blank submission"
        verbose_name_plural = "Fill blank submissions"


class FillBlankAnswer(models.Model):
    """Ответ на конкретный пропуск.

    Attributes:
        submission: Ссылка на ответ с пропусками.
        position: Позиция пропуска.
        answer_text: Текст ответа.
    """
    submission = models.ForeignKey(
        "assignments.FillBlankSubmission",
        on_delete=models.CASCADE,
        related_name="answers",
    )
    position = models.PositiveIntegerField()
    answer_text = models.CharField(max_length=255)

    class Meta:
        """Метаданные ответа на пропуск."""
        verbose_name = "Fill blank answer"
        verbose_name_plural = "Fill blank answers"
        unique_together = ("submission", "position")


class ShortAnswerSubmission(models.Model):
    """Краткий ответ.

    Attributes:
        submission: Ссылка на ответ.
        answer_text: Текст ответа.
    """
    submission = models.OneToOneField(
        "assignments.Submission",
        on_delete=models.CASCADE,
        related_name="short_answer",
    )
    answer_text = models.CharField(max_length=255)

    class Meta:
        """Метаданные ответа типа short answer."""
        verbose_name = "Short answer submission"
        verbose_name_plural = "Short answer submissions"


class LongAnswerSubmission(models.Model):
    """Развернутый ответ.

    Attributes:
        submission: Ссылка на ответ.
        answer_text: Текст ответа.
    """
    submission = models.OneToOneField(
        "assignments.Submission",
        on_delete=models.CASCADE,
        related_name="long_answer",
    )
    answer_text = models.TextField()

    class Meta:
        """Метаданные ответа типа long answer."""
        verbose_name = "Long answer submission"
        verbose_name_plural = "Long answer submissions"
