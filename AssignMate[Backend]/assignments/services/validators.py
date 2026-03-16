from assignments.choices import AssignmentType
from assignments.models import (
    FillBlankAssignment,
    ShortAnswerAssignment,
    LongAnswerAssignment,
)


class AssignmentValidationError(Exception):
    """Ошибка валидации данных ответа на задание.

    Используется для отделения бизнес-валидации ответов от ошибок сериализаторов.
    """
    pass


def validate_submission_data(assignment, data: dict):
    """
    Проверяет, что формат ответа соответствует типу задания.

    data — уже очищенные данные (НЕ request).

    Args:
        assignment: Домашнее задание, для которого проверяется ответ.
        data: Валидированные данные ответа.

    Returns:
        None.

    Raises:
        AssignmentValidationError: Если данные не соответствуют типу задания.
    """
    assignment_type = assignment.type

    selected_option = data.get("selected_option")
    selected_options = data.get("selected_options")
    answers = data.get("answers")
    answer_text = data.get("answer_text")
    files = data.get("files")

    if assignment_type == AssignmentType.SINGLE_CHOICE:
        if not selected_option:
            raise AssignmentValidationError("Exactly one option must be selected.")

    elif assignment_type == AssignmentType.MULTIPLE_CHOICE:
        if not selected_options or len(selected_options) < 1:
            raise AssignmentValidationError("At least one option must be selected.")

    elif assignment_type == AssignmentType.FILL_BLANK:
        try:
            fill_blank = assignment.fill_blank
        except FillBlankAssignment.DoesNotExist as exc:
            raise AssignmentValidationError("Fill blank configuration is missing.") from exc
        if not answers:
            raise AssignmentValidationError("Answers for blanks are required.")
        blanks = list(fill_blank.blanks.all())
        required_positions = {blank.position for blank in blanks}
        provided_positions = {item.get("position") for item in answers}
        if None in provided_positions:
            raise AssignmentValidationError("Blank positions are required.")
        if len(provided_positions) != len(answers):
            raise AssignmentValidationError("Duplicate blank positions are not allowed.")
        if required_positions != provided_positions:
            raise AssignmentValidationError("All blanks must be answered.")
        if any(not item.get("answer_text") for item in answers):
            raise AssignmentValidationError("Blank answers must be non-empty.")

    elif assignment_type == AssignmentType.SHORT_ANSWER:
        try:
            short_answer = assignment.short_answer
        except ShortAnswerAssignment.DoesNotExist as exc:
            raise AssignmentValidationError("Short answer configuration is missing.") from exc
        if not answer_text:
            raise AssignmentValidationError("Short answer is required.")
        max_length = short_answer.max_length
        if max_length and len(answer_text) > max_length:
            raise AssignmentValidationError("Answer exceeds maximum length.")

    elif assignment_type == AssignmentType.LONG_ANSWER:
        try:
            long_answer = assignment.long_answer
        except LongAnswerAssignment.DoesNotExist as exc:
            raise AssignmentValidationError("Long answer configuration is missing.") from exc
        if not answer_text:
            raise AssignmentValidationError("Long answer is required.")
        max_files = long_answer.max_files
        if max_files and files and len(files) > max_files:
            raise AssignmentValidationError("Too many files attached.")

    else:
        raise AssignmentValidationError("Unsupported assignment type.")
