from rest_framework import serializers

from assignments.choices import AssignmentType
from assignments.models import (
    Assignment,
    QuestionOption,
    Submission,
    SubmissionFile,
    Review,
    SingleChoiceAssignment,
    MultipleChoiceAssignment,
    FillBlankAssignment,
    FillBlankItem,
    ShortAnswerAssignment,
    LongAnswerAssignment,
    SingleChoiceSubmission,
    MultipleChoiceSubmission,
    FillBlankSubmission,
    FillBlankAnswer,
    ShortAnswerSubmission,
    LongAnswerSubmission,
)


def get_assignment_detail_instance(assignment):
    """Возвращает детальный объект задания по его типу.

    Args:
        assignment: Экземпляр задания.

    Returns:
        object | None: Детальная модель задания или None.
    """
    if assignment.type == AssignmentType.SINGLE_CHOICE:
        return getattr(assignment, "single_choice", None)
    if assignment.type == AssignmentType.MULTIPLE_CHOICE:
        return getattr(assignment, "multiple_choice", None)
    if assignment.type == AssignmentType.FILL_BLANK:
        return getattr(assignment, "fill_blank", None)
    if assignment.type == AssignmentType.SHORT_ANSWER:
        return getattr(assignment, "short_answer", None)
    if assignment.type == AssignmentType.LONG_ANSWER:
        return getattr(assignment, "long_answer", None)
    return None


def get_submission_detail_instance(submission):
    """Возвращает детальный объект ответа по типу задания.

    Args:
        submission: Экземпляр ответа на задание.

    Returns:
        object | None: Детальная модель ответа или None.
    """
    assignment_type = submission.assignment.type
    if assignment_type == AssignmentType.SINGLE_CHOICE:
        return getattr(submission, "single_choice", None)
    if assignment_type == AssignmentType.MULTIPLE_CHOICE:
        return getattr(submission, "multiple_choice", None)
    if assignment_type == AssignmentType.FILL_BLANK:
        return getattr(submission, "fill_blank", None)
    if assignment_type == AssignmentType.SHORT_ANSWER:
        return getattr(submission, "short_answer", None)
    if assignment_type == AssignmentType.LONG_ANSWER:
        return getattr(submission, "long_answer", None)
    return None


class QuestionOptionSerializer(serializers.ModelSerializer):
    """
    Сериализатор вариантов ответа на задание.

    Attributes:
        id: Идентификатор варианта ответа.
        text: Текст варианта ответа.
    """

    class Meta:
        """Конфигурация сериализатора вариантов ответа."""
        model = QuestionOption
        fields = ["id", "text"]
        read_only_fields = ["id"]


class QuestionOptionWriteSerializer(serializers.Serializer):
    """Сериализатор для записи вариантов ответа.

    Attributes:
        text: Текст варианта ответа.
        is_correct: Признак корректного ответа.
    """
    text = serializers.CharField()
    is_correct = serializers.BooleanField(default=False)


class FillBlankItemSerializer(serializers.ModelSerializer):
    """Сериализатор пропуска для чтения.

    Attributes:
        position: Позиция пропуска.
        correct_text: Правильный текст пропуска.
    """

    class Meta:
        """Конфигурация сериализатора пропуска."""
        model = FillBlankItem
        fields = ["position", "correct_text"]


class FillBlankItemWriteSerializer(serializers.Serializer):
    """Сериализатор пропуска для записи.

    Attributes:
        position: Позиция пропуска.
        correct_text: Правильный текст пропуска.
    """
    position = serializers.IntegerField()
    correct_text = serializers.CharField()


class SingleChoiceAssignmentDetailSerializer(serializers.ModelSerializer):
    """Детальный сериализатор задания с одним вариантом ответа."""
    options = QuestionOptionSerializer(many=True, source="assignment.options", read_only=True)

    class Meta:
        """Конфигурация детализации задания с одним вариантом ответа."""
        model = SingleChoiceAssignment
        fields = ["shuffle_options", "options"]


class MultipleChoiceAssignmentDetailSerializer(serializers.ModelSerializer):
    """Детальный сериализатор задания с несколькими вариантами ответа."""
    options = QuestionOptionSerializer(many=True, source="assignment.options", read_only=True)

    class Meta:
        """Конфигурация детализации задания с несколькими вариантами ответа."""
        model = MultipleChoiceAssignment
        fields = ["shuffle_options", "options"]


class FillBlankAssignmentDetailSerializer(serializers.ModelSerializer):
    """Детальный сериализатор задания с пропусками."""
    blanks = FillBlankItemSerializer(many=True, read_only=True)

    class Meta:
        """Конфигурация детализации задания с пропусками."""
        model = FillBlankAssignment
        fields = ["text_template", "blanks"]


class ShortAnswerAssignmentDetailSerializer(serializers.ModelSerializer):
    """Детальный сериализатор задания с коротким ответом."""
    class Meta:
        """Конфигурация детализации задания с кратким ответом."""
        model = ShortAnswerAssignment
        fields = ["max_length", "case_sensitive"]


class LongAnswerAssignmentDetailSerializer(serializers.ModelSerializer):
    """Детальный сериализатор задания с развернутым ответом."""
    class Meta:
        """Конфигурация детализации задания с развернутым ответом."""
        model = LongAnswerAssignment
        fields = ["max_files"]


class SingleChoiceAssignmentWriteSerializer(serializers.ModelSerializer):
    """Сериализатор записи задания с одним вариантом ответа."""
    options = QuestionOptionWriteSerializer(many=True)

    class Meta:
        """Конфигурация сериализатора записи single choice задания."""
        model = SingleChoiceAssignment
        fields = ["shuffle_options", "options"]

    def validate(self, attrs):
        """Проверяет наличие хотя бы одного варианта ответа.

        Args:
            attrs: Валидируемые данные.

        Returns:
            dict: Валидированные данные.

        Raises:
            serializers.ValidationError: Если список вариантов пуст.
        """
        if not attrs.get("options"):
            raise serializers.ValidationError({"options": "At least one option is required."})
        return attrs

    def create(self, validated_data):
        """Создает детализацию задания и варианты ответов.

        Args:
            validated_data: Валидированные данные.

        Returns:
            SingleChoiceAssignment: Созданная детализация задания.
        """
        options_data = validated_data.pop("options", [])
        assignment = self.context["assignment"]
        detail = SingleChoiceAssignment.objects.create(assignment=assignment, **validated_data)
        self._replace_options(assignment, options_data)
        return detail

    def update(self, instance, validated_data):
        """Обновляет детализацию задания и варианты ответов.

        Args:
            instance: Экземпляр детализации задания.
            validated_data: Валидированные данные.

        Returns:
            SingleChoiceAssignment: Обновленная детализация задания.
        """
        options_data = validated_data.pop("options", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if options_data is not None:
            self._replace_options(instance.assignment, options_data)
        return instance

    @staticmethod
    def _replace_options(assignment, options_data):
        """Полностью заменяет варианты ответов для задания.

        Args:
            assignment: Экземпляр задания.
            options_data: Список вариантов ответов.

        Returns:
            None.
        """
        assignment.options.all().delete()
        for option in options_data:
            QuestionOption.objects.create(assignment=assignment, **option)


class MultipleChoiceAssignmentWriteSerializer(serializers.ModelSerializer):
    """Сериализатор записи задания с несколькими вариантами ответа."""
    options = QuestionOptionWriteSerializer(many=True)

    class Meta:
        """Конфигурация сериализатора записи multiple choice задания."""
        model = MultipleChoiceAssignment
        fields = ["shuffle_options", "options"]

    def validate(self, attrs):
        """Проверяет наличие хотя бы одного варианта ответа.

        Args:
            attrs: Валидируемые данные.

        Returns:
            dict: Валидированные данные.

        Raises:
            serializers.ValidationError: Если список вариантов пуст.
        """
        if not attrs.get("options"):
            raise serializers.ValidationError({"options": "At least one option is required."})
        return attrs

    def create(self, validated_data):
        """Создает детализацию задания и варианты ответов.

        Args:
            validated_data: Валидированные данные.

        Returns:
            MultipleChoiceAssignment: Созданная детализация задания.
        """
        options_data = validated_data.pop("options", [])
        assignment = self.context["assignment"]
        detail = MultipleChoiceAssignment.objects.create(assignment=assignment, **validated_data)
        self._replace_options(assignment, options_data)
        return detail

    def update(self, instance, validated_data):
        """Обновляет детализацию задания и варианты ответов.

        Args:
            instance: Экземпляр детализации задания.
            validated_data: Валидированные данные.

        Returns:
            MultipleChoiceAssignment: Обновленная детализация задания.
        """
        options_data = validated_data.pop("options", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if options_data is not None:
            self._replace_options(instance.assignment, options_data)
        return instance

    @staticmethod
    def _replace_options(assignment, options_data):
        """Полностью заменяет варианты ответов для задания.

        Args:
            assignment: Экземпляр задания.
            options_data: Список вариантов ответов.

        Returns:
            None.
        """
        assignment.options.all().delete()
        for option in options_data:
            QuestionOption.objects.create(assignment=assignment, **option)


class FillBlankAssignmentWriteSerializer(serializers.ModelSerializer):
    """Сериализатор записи задания с пропусками."""
    blanks = FillBlankItemWriteSerializer(many=True)

    class Meta:
        """Конфигурация сериализатора записи fill blank задания."""
        model = FillBlankAssignment
        fields = ["text_template", "blanks"]

    def validate(self, attrs):
        """Проверяет наличие хотя бы одного пропуска.

        Args:
            attrs: Валидируемые данные.

        Returns:
            dict: Валидированные данные.

        Raises:
            serializers.ValidationError: Если список пропусков пуст.
        """
        if not attrs.get("blanks"):
            raise serializers.ValidationError({"blanks": "At least one blank is required."})
        return attrs

    def create(self, validated_data):
        """Создает детализацию задания и пропуски.

        Args:
            validated_data: Валидированные данные.

        Returns:
            FillBlankAssignment: Созданная детализация задания.
        """
        blanks_data = validated_data.pop("blanks", [])
        assignment = self.context["assignment"]
        detail = FillBlankAssignment.objects.create(assignment=assignment, **validated_data)
        self._replace_blanks(detail, blanks_data)
        return detail

    def update(self, instance, validated_data):
        """Обновляет детализацию задания и пропуски.

        Args:
            instance: Экземпляр детализации задания.
            validated_data: Валидированные данные.

        Returns:
            FillBlankAssignment: Обновленная детализация задания.
        """
        blanks_data = validated_data.pop("blanks", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if blanks_data is not None:
            self._replace_blanks(instance, blanks_data)
        return instance

    @staticmethod
    def _replace_blanks(detail, blanks_data):
        """Полностью заменяет пропуски для задания.

        Args:
            detail: Экземпляр детализации задания.
            blanks_data: Список пропусков.

        Returns:
            None.
        """
        detail.blanks.all().delete()
        for blank in blanks_data:
            FillBlankItem.objects.create(fill_blank=detail, **blank)


class ShortAnswerAssignmentWriteSerializer(serializers.ModelSerializer):
    """Сериализатор записи задания с кратким ответом."""
    class Meta:
        """Конфигурация сериализатора записи short answer задания."""
        model = ShortAnswerAssignment
        fields = ["max_length", "case_sensitive"]

    def create(self, validated_data):
        """Создает детализацию задания с кратким ответом.

        Args:
            validated_data: Валидированные данные.

        Returns:
            ShortAnswerAssignment: Созданная детализация задания.
        """
        assignment = self.context["assignment"]
        return ShortAnswerAssignment.objects.create(assignment=assignment, **validated_data)


class LongAnswerAssignmentWriteSerializer(serializers.ModelSerializer):
    """Сериализатор записи задания с развернутым ответом."""
    class Meta:
        """Конфигурация сериализатора записи long answer задания."""
        model = LongAnswerAssignment
        fields = ["max_files"]

    def create(self, validated_data):
        """Создает детализацию задания с развернутым ответом.

        Args:
            validated_data: Валидированные данные.

        Returns:
            LongAnswerAssignment: Созданная детализация задания.
        """
        assignment = self.context["assignment"]
        return LongAnswerAssignment.objects.create(assignment=assignment, **validated_data)


ASSIGNMENT_DETAIL_READ_SERIALIZERS = {
    AssignmentType.SINGLE_CHOICE: SingleChoiceAssignmentDetailSerializer,
    AssignmentType.MULTIPLE_CHOICE: MultipleChoiceAssignmentDetailSerializer,
    AssignmentType.FILL_BLANK: FillBlankAssignmentDetailSerializer,
    AssignmentType.SHORT_ANSWER: ShortAnswerAssignmentDetailSerializer,
    AssignmentType.LONG_ANSWER: LongAnswerAssignmentDetailSerializer,
}

ASSIGNMENT_DETAIL_WRITE_SERIALIZERS = {
    AssignmentType.SINGLE_CHOICE: SingleChoiceAssignmentWriteSerializer,
    AssignmentType.MULTIPLE_CHOICE: MultipleChoiceAssignmentWriteSerializer,
    AssignmentType.FILL_BLANK: FillBlankAssignmentWriteSerializer,
    AssignmentType.SHORT_ANSWER: ShortAnswerAssignmentWriteSerializer,
    AssignmentType.LONG_ANSWER: LongAnswerAssignmentWriteSerializer,
}


class HomeworkReadSerializer(serializers.ModelSerializer):
    """
    Сериализатор для чтения домашних заданий.

    Attributes:
        id: Идентификатор задания.
        order: Порядковый номер задания.
        title: Название задания.
        description: Описание задания.
        type: Тип задания.
        max_score: Максимальный балл.
        deadline: Дедлайн сдачи.
        details: Детализация по типу задания.
    """
    details = serializers.SerializerMethodField()

    class Meta:
        """Конфигурация сериализатора чтения задания."""
        model = Assignment
        fields = [
            "id",
            "order",
            "title",
            "description",
            "type",
            "max_score",
            "deadline",
            "details",
        ]
        read_only_fields = ["id"]

    def get_details(self, obj):
        """Возвращает детализацию задания по его типу.

        Args:
            obj: Экземпляр задания.

        Returns:
            dict | None: Сериализованные данные детализации или None.
        """
        serializer_cls = ASSIGNMENT_DETAIL_READ_SERIALIZERS.get(obj.type)
        if serializer_cls is None:
            return None
        detail = get_assignment_detail_instance(obj)
        if detail is None:
            return None
        return serializer_cls(detail).data


class HomeworkWriteSerializer(serializers.ModelSerializer):
    """
    Базовый сериализатор записи домашних заданий.

    Attributes:
        details: Детализация задания по типу.
    """
    details = serializers.DictField(write_only=True, required=False)

    class Meta:
        """Конфигурация сериализатора записи задания."""
        model = Assignment
        fields = [
            "id",
            "order",
            "title",
            "description",
            "type",
            "max_score",
            "deadline",
            "details",
        ]
        read_only_fields = ["id"]

    def _save_details(self, assignment, details):
        """Сохраняет детализацию задания в зависимости от типа.

        Args:
            assignment: Экземпляр задания.
            details: Данные детализации.

        Returns:
            None.

        Raises:
            serializers.ValidationError: Если тип задания не поддерживается.
        """
        serializer_cls = ASSIGNMENT_DETAIL_WRITE_SERIALIZERS.get(assignment.type)
        if serializer_cls is None:
            raise serializers.ValidationError({"type": "Unsupported assignment type."})
        detail_instance = get_assignment_detail_instance(assignment)
        serializer = serializer_cls(
            detail_instance,
            data=details,
            context={"assignment": assignment},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()


class HomeworkCreateSerializer(HomeworkWriteSerializer):
    """
    Сериализатор для создания домашних заданий.
    """

    def validate(self, attrs):
        """Проверяет наличие детализации задания.

        Args:
            attrs: Валидируемые данные.

        Returns:
            dict: Валидированные данные.

        Raises:
            serializers.ValidationError: Если детализация не передана.
        """
        if "details" not in attrs:
            raise serializers.ValidationError({"details": "This field is required."})
        return attrs

    def create(self, validated_data):
        """Создает задание и сохраняет его детализацию.

        Args:
            validated_data: Валидированные данные.

        Returns:
            Assignment: Созданное задание.
        """
        details = validated_data.pop("details")
        assignment = super().create(validated_data)
        self._save_details(assignment, details)
        return assignment


class HomeworkUpdateSerializer(HomeworkWriteSerializer):
    """
    Сериализатор для обновления домашних заданий.
    """

    def validate(self, attrs):
        """Запрещает изменение типа задания.

        Args:
            attrs: Валидируемые данные.

        Returns:
            dict: Валидированные данные.

        Raises:
            serializers.ValidationError: Если пытаются изменить тип.
        """
        if "type" in attrs and attrs["type"] != self.instance.type:
            raise serializers.ValidationError({"type": "Changing type is not supported."})
        return attrs

    def update(self, instance, validated_data):
        """Обновляет задание и его детализацию.

        Args:
            instance: Экземпляр задания.
            validated_data: Валидированные данные.

        Returns:
            Assignment: Обновленное задание.
        """
        details = validated_data.pop("details", None)
        assignment = super().update(instance, validated_data)
        if details is not None:
            self._save_details(assignment, details)
        return assignment


class SubmissionFileSerializer(serializers.ModelSerializer):
    """
    Сериализатор файлов ответа на домашнее задание.

    Attributes:
        id: Идентификатор файла ответа.
        file: Файл ответа.
    """

    class Meta:
        """Конфигурация сериализатора файлов ответа."""
        model = SubmissionFile
        fields = ["id", "file"]
        read_only_fields = ["id"]


class ReviewReadSerializer(serializers.ModelSerializer):
    """
    Сериализатор чтения ревью на ответ.

    Attributes:
        id: Идентификатор ревью.
        reviewer: Идентификатор проверяющего.
        score: Оценка.
        comment: Комментарий.
        created_at: Дата создания.
        updated_at: Дата обновления.
    """

    class Meta:
        """Конфигурация сериализатора чтения ревью."""
        model = Review
        fields = ["id", "reviewer", "score", "comment", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class ReviewCreateSerializer(serializers.Serializer):
    """
    Сериализатор создания ревью на ответ или возврата на переделку.

    Attributes:
        score: Оценка (необязательно при возврате на доработку).
        comment: Комментарий к ревью.
        return_for_revision: Флаг возврата на доработку.
    """
    score = serializers.IntegerField(required=False, min_value=0)
    comment = serializers.CharField(required=False, allow_blank=True, default="")
    return_for_revision = serializers.BooleanField(required=False, default=False)

    def validate(self, attrs):
        """Проверяет согласованность параметров ревью.

        Args:
            attrs: Валидируемые данные.

        Returns:
            dict: Валидированные данные.

        Raises:
            serializers.ValidationError: При некорректной комбинации полей.
        """
        return_for_revision = attrs.get("return_for_revision", False)
        score = attrs.get("score")

        if return_for_revision:
            if score is not None:
                raise serializers.ValidationError(
                    {"score": "Score should not be provided when returning for revision."}
                )
            return attrs

        if score is None:
            raise serializers.ValidationError({"score": "Score is required."})

        return attrs

    def validate_score(self, value):
        """
        Проверяет, что оценка находится в допустимом диапазоне.

        Args:
            value: Оценка для проверки.

        Returns:
            int: Валидированная оценка.

        Raises:
            serializers.ValidationError: Если оценка выходит за пределы.
        """
        assignment = self.context["assignment"]
        if value < 0 or value > assignment.max_score:
            raise serializers.ValidationError("Score must be between 0 and max_score.")
        return value


class SingleChoiceSubmissionDetailSerializer(serializers.ModelSerializer):
    """Детальный сериализатор ответа с одним вариантом."""
    selected_option = QuestionOptionSerializer(read_only=True)

    class Meta:
        """Конфигурация детализации ответа single choice."""
        model = SingleChoiceSubmission
        fields = ["selected_option"]


class MultipleChoiceSubmissionDetailSerializer(serializers.ModelSerializer):
    """Детальный сериализатор ответа с несколькими вариантами."""
    selected_options = QuestionOptionSerializer(many=True, read_only=True)

    class Meta:
        """Конфигурация детализации ответа multiple choice."""
        model = MultipleChoiceSubmission
        fields = ["selected_options"]


class FillBlankAnswerSerializer(serializers.ModelSerializer):
    """Сериализатор ответа на пропуск."""
    class Meta:
        """Конфигурация сериализатора ответа на пропуск."""
        model = FillBlankAnswer
        fields = ["position", "answer_text"]


class FillBlankSubmissionDetailSerializer(serializers.ModelSerializer):
    """Детальный сериализатор ответа с пропусками."""
    answers = FillBlankAnswerSerializer(many=True, read_only=True)

    class Meta:
        """Конфигурация детализации ответа fill blank."""
        model = FillBlankSubmission
        fields = ["answers"]


class ShortAnswerSubmissionDetailSerializer(serializers.ModelSerializer):
    """Детальный сериализатор ответа с кратким текстом."""
    class Meta:
        """Конфигурация детализации ответа short answer."""
        model = ShortAnswerSubmission
        fields = ["answer_text"]


class LongAnswerSubmissionDetailSerializer(serializers.ModelSerializer):
    """Детальный сериализатор ответа с развернутым текстом и файлами."""
    files = SubmissionFileSerializer(many=True, source="submission.files", read_only=True)

    class Meta:
        """Конфигурация детализации ответа long answer."""
        model = LongAnswerSubmission
        fields = ["answer_text", "files"]


SUBMISSION_DETAIL_READ_SERIALIZERS = {
    AssignmentType.SINGLE_CHOICE: SingleChoiceSubmissionDetailSerializer,
    AssignmentType.MULTIPLE_CHOICE: MultipleChoiceSubmissionDetailSerializer,
    AssignmentType.FILL_BLANK: FillBlankSubmissionDetailSerializer,
    AssignmentType.SHORT_ANSWER: ShortAnswerSubmissionDetailSerializer,
    AssignmentType.LONG_ANSWER: LongAnswerSubmissionDetailSerializer,
}


class SubmissionReadSerializer(serializers.ModelSerializer):
    """
    Сериализатор для чтения ответа на задание.

    Attributes:
        id: Идентификатор ответа.
        assignment: Идентификатор задания.
        assignment_type: Тип задания.
        student: Идентификатор студента.
        student_name: Отображаемое имя студента.
        status: Статус проверки.
        timeliness_status: Статус сдачи относительно дедлайна.
        review: Данные ревью.
        details: Детализация ответа по типу задания.
        created_at: Дата создания.
        updated_at: Дата обновления.
    """
    review = ReviewReadSerializer(read_only=True)
    details = serializers.SerializerMethodField()
    assignment_type = serializers.CharField(source="assignment.type", read_only=True)
    student_name = serializers.SerializerMethodField()

    class Meta:
        """Конфигурация сериализатора чтения ответа."""
        model = Submission
        fields = [
            "id",
            "assignment",
            "assignment_type",
            "student",
            "student_name",
            "status",
            "timeliness_status",
            "review",
            "details",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "assignment",
            "student",
            "student_name",
            "status",
            "timeliness_status",
            "created_at",
            "updated_at",
        ]

    def get_details(self, obj):
        """Возвращает детализацию ответа по типу задания.

        Args:
            obj: Экземпляр ответа.

        Returns:
            dict | None: Детализация ответа или None.
        """
        serializer_cls = SUBMISSION_DETAIL_READ_SERIALIZERS.get(obj.assignment.type)
        if serializer_cls is None:
            return None
        detail = get_submission_detail_instance(obj)
        if detail is None:
            return None
        return serializer_cls(detail).data

    def get_student_name(self, obj):
        """Возвращает отображаемое имя студента.

        Args:
            obj: Экземпляр ответа.

        Returns:
            str: Имя студента или email.
        """
        student = obj.student
        if not student:
            return ""
        full_name = getattr(student, "get_full_name", None)
        if callable(full_name):
            name = full_name()
            if name:
                return name
        short_name = getattr(student, "get_short_name", None)
        if callable(short_name):
            name = short_name()
            if name:
                return name
        return getattr(student, "email", str(student))


class SingleChoiceSubmissionCreateSerializer(serializers.Serializer):
    """Сериализатор создания ответа с одним вариантом."""
    selected_option = serializers.PrimaryKeyRelatedField(
        queryset=QuestionOption.objects.none(),
    )

    def __init__(self, *args, **kwargs):
        """Инициализирует queryset вариантов ответа.

        Args:
            *args: Позиционные аргументы.
            **kwargs: Именованные аргументы.
        """
        super().__init__(*args, **kwargs)
        assignment = self.context.get("assignment")
        if assignment is not None:
            self.fields["selected_option"].queryset = assignment.options.all()


class MultipleChoiceSubmissionCreateSerializer(serializers.Serializer):
    """Сериализатор создания ответа с несколькими вариантами."""
    selected_options = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=QuestionOption.objects.none(),
    )

    def __init__(self, *args, **kwargs):
        """Инициализирует queryset вариантов ответа.

        Args:
            *args: Позиционные аргументы.
            **kwargs: Именованные аргументы.
        """
        super().__init__(*args, **kwargs)
        assignment = self.context.get("assignment")
        if assignment is not None:
            self.fields["selected_options"].queryset = assignment.options.all()


class FillBlankAnswerInputSerializer(serializers.Serializer):
    """Сериализатор ответа на пропуск при создании."""
    position = serializers.IntegerField()
    answer_text = serializers.CharField()


class FillBlankSubmissionCreateSerializer(serializers.Serializer):
    """Сериализатор создания ответа с пропусками."""
    answers = FillBlankAnswerInputSerializer(many=True)


class ShortAnswerSubmissionCreateSerializer(serializers.Serializer):
    """Сериализатор создания краткого ответа."""
    answer_text = serializers.CharField()


class LongAnswerSubmissionCreateSerializer(serializers.Serializer):
    """Сериализатор создания развернутого ответа."""
    answer_text = serializers.CharField()
    files = serializers.ListField(
        child=serializers.FileField(),
        required=False,
        allow_empty=True,
    )


SUBMISSION_CREATE_SERIALIZERS = {
    AssignmentType.SINGLE_CHOICE: SingleChoiceSubmissionCreateSerializer,
    AssignmentType.MULTIPLE_CHOICE: MultipleChoiceSubmissionCreateSerializer,
    AssignmentType.FILL_BLANK: FillBlankSubmissionCreateSerializer,
    AssignmentType.SHORT_ANSWER: ShortAnswerSubmissionCreateSerializer,
    AssignmentType.LONG_ANSWER: LongAnswerSubmissionCreateSerializer,
}
