from django.db import models


class SingleChoiceAssignment(models.Model):
    """
    Тип задания: выбор одного варианта.

    Attributes:
        assignment: Ссылка на задание.
        shuffle_options: Перемешивать ли варианты ответов.
    """
    assignment = models.OneToOneField(
        "assignments.Assignment",
        on_delete=models.CASCADE,
        related_name="single_choice",
    )
    shuffle_options = models.BooleanField(default=False)

    class Meta:
        """Метаданные задания типа single choice."""
        verbose_name = "Single choice assignment"
        verbose_name_plural = "Single choice assignments"


class MultipleChoiceAssignment(models.Model):
    """
    Тип задания: выбор нескольких вариантов.

    Attributes:
        assignment: Ссылка на задание.
        shuffle_options: Перемешивать ли варианты ответов.
    """
    assignment = models.OneToOneField(
        "assignments.Assignment",
        on_delete=models.CASCADE,
        related_name="multiple_choice",
    )
    shuffle_options = models.BooleanField(default=False)

    class Meta:
        """Метаданные задания типа multiple choice."""
        verbose_name = "Multiple choice assignment"
        verbose_name_plural = "Multiple choice assignments"


class FillBlankAssignment(models.Model):
    """
    Тип задания: вставить пропущенное.

    Attributes:
        assignment: Ссылка на задание.
        text_template: Шаблон текста с пропусками.
    """
    assignment = models.OneToOneField(
        "assignments.Assignment",
        on_delete=models.CASCADE,
        related_name="fill_blank",
    )
    text_template = models.TextField()

    class Meta:
        """Метаданные задания типа fill blank."""
        verbose_name = "Fill blank assignment"
        verbose_name_plural = "Fill blank assignments"


class FillBlankItem(models.Model):
    """
    Один пропуск в задании типа fill blank.

    Attributes:
        fill_blank: Ссылка на задание типа fill blank.
        position: Позиция пропуска в тексте.
        correct_text: Правильный текст для пропуска.
    """
    fill_blank = models.ForeignKey(
        "assignments.FillBlankAssignment",
        on_delete=models.CASCADE,
        related_name="blanks",
    )
    position = models.PositiveIntegerField()
    correct_text = models.CharField(max_length=255)

    class Meta:
        """Метаданные элемента пропуска."""
        verbose_name = "Fill blank item"
        verbose_name_plural = "Fill blank items"
        unique_together = ("fill_blank", "position")


class ShortAnswerAssignment(models.Model):
    """
    Тип задания: краткий ответ.

    Attributes:
        assignment: Ссылка на задание.
        max_length: Максимальная длина ответа.
        case_sensitive: Учитывать регистр.
    """
    assignment = models.OneToOneField(
        "assignments.Assignment",
        on_delete=models.CASCADE,
        related_name="short_answer",
    )
    max_length = models.PositiveIntegerField(blank=True, null=True)
    case_sensitive = models.BooleanField(default=False)

    class Meta:
        """Метаданные задания типа short answer."""
        verbose_name = "Short answer assignment"
        verbose_name_plural = "Short answer assignments"


class LongAnswerAssignment(models.Model):
    """
    Тип задания: развернутый ответ.

    Attributes:
        assignment: Ссылка на задание.
        max_files: Максимальное количество прикрепляемых файлов.
    """
    assignment = models.OneToOneField(
        "assignments.Assignment",
        on_delete=models.CASCADE,
        related_name="long_answer",
    )
    max_files = models.PositiveIntegerField(blank=True, null=True)

    class Meta:
        """Метаданные задания типа long answer."""
        verbose_name = "Long answer assignment"
        verbose_name_plural = "Long answer assignments"
