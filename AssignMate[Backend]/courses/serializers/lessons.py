from rest_framework import serializers

from courses.models import Lesson


class LessonReadSerializer(serializers.ModelSerializer):
    """
    Сериализатор для чтения модели уроков.

    Attributes:
        id: Идентификатор урока.
        order: Порядковый номер урока.
        title: Название урока.
        description: Описание урока.
        materials: Материалы урока.
        duration: Длительность урока.
    """

    class Meta:
        """Конфигурация сериализатора чтения урока."""
        model = Lesson
        fields = ['id', 'order', 'title', 'description', 'materials', 'duration']
        read_only_fields = ['id']


class LessonCreateSerializer(serializers.ModelSerializer):
    """
    Сериализатор для создания модели уроков.

    Attributes:
        title: Название урока.
        description: Описание урока.
        materials: Материалы урока.
        duration: Длительность урока.
    """

    class Meta:
        """Конфигурация сериализатора создания урока."""
        model = Lesson
        fields = ['id', 'order', 'title', 'description', 'materials', 'duration']
        read_only_fields = ['id', 'order']


class LessonUpdateSerializer(serializers.ModelSerializer):
    """
    Сериализатор для обновления модели уроков.

    Attributes:
        order: Порядковый номер урока.
        title: Название урока.
        description: Описание урока.
        materials: Материалы урока.
        duration: Длительность урока.
    """

    class Meta:
        """Конфигурация сериализатора обновления урока."""
        model = Lesson
        fields = ['id', 'order', 'title', 'description', 'materials', 'duration']
        read_only_fields = ['id']
