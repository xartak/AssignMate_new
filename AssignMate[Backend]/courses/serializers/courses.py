from rest_framework import serializers
from courses.models import Course


class CourseReadSerializer(serializers.ModelSerializer):
    """
    Сериализатор для чтения модели курсов.

    Attributes:
        id: Идентификатор курса.
        author: Идентификатор автора курса.
        title: Название курса.
        description: Описание курса.
    """

    class Meta:
        """Конфигурация сериализатора чтения курса."""
        model = Course
        fields = ['id', 'author', 'title', 'description']
        read_only_fields = ['id']


class CourseWriteSerializer(serializers.ModelSerializer):
    """
    Базовый сериализатор записи курса.

    Attributes:
        grading_scale: Шкала оценивания в JSON-формате.
    """
    grading_scale = serializers.JSONField(
        required=False,
        allow_null=True,
    )


class CourseCreateSerializer(CourseWriteSerializer):
    """
    Сериализатор для создания модели курсов.

    Attributes:
        title: Название курса.
        description: Описание курса.
        grading_scale: Шкала оценивания.
    """

    class Meta:
        """Конфигурация сериализатора создания курса."""
        model = Course
        fields = ['id', 'title', 'description', 'grading_scale']
        read_only_fields = ['id']


class CourseUpdateSerializer(CourseWriteSerializer):
    """
    Сериализатор для обновления модели курсов.

    Attributes:
        title: Название курса.
        description: Описание курса.
        grading_scale: Шкала оценивания.
    """
    grading_scale = serializers.JSONField(
        required=False,
        allow_null=True,
    )

    class Meta:
        """Конфигурация сериализатора обновления курса."""
        model = Course
        fields = ['id', 'title', 'description', 'grading_scale']
        read_only_fields = ['id']
