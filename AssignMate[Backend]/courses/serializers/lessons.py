from rest_framework import serializers

from courses.constants import ALLOWED_LESSON_MATERIAL_EXTENSIONS
from courses.models import Lesson, LessonMaterial


def _build_materials_list(lesson: Lesson) -> list[str]:
    materials: list[str] = []
    if lesson.materials:
        try:
            materials.append(lesson.materials.url)
        except Exception:
            pass
    for material in lesson.materials_files.all():
        if material.file:
            try:
                materials.append(material.file.url)
            except Exception:
                continue
    return materials


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

    materials = serializers.SerializerMethodField()

    class Meta:
        """Конфигурация сериализатора чтения урока."""
        model = Lesson
        fields = ['id', 'order', 'title', 'description', 'materials', 'duration']
        read_only_fields = ['id']

    def get_materials(self, obj):
        return _build_materials_list(obj)


class LessonCreateSerializer(serializers.ModelSerializer):
    """
    Сериализатор для создания модели уроков.

    Attributes:
        title: Название урока.
        description: Описание урока.
        materials: Материалы урока.
        duration: Длительность урока.
    """

    materials = serializers.ListField(
        child=serializers.FileField(),
        required=False,
        write_only=True,
    )

    class Meta:
        """Конфигурация сериализатора создания урока."""
        model = Lesson
        fields = ['id', 'order', 'title', 'description', 'materials', 'duration']
        read_only_fields = ['id', 'order']

    def validate_materials(self, files):
        invalid_files = []
        allowed = set(ALLOWED_LESSON_MATERIAL_EXTENSIONS)
        for uploaded in files:
            name = uploaded.name or ""
            ext = name.rsplit(".", 1)[-1].lower() if "." in name else ""
            if ext not in allowed:
                invalid_files.append(name or "unknown")
        if invalid_files:
            allowed_list = ", ".join(sorted(allowed))
            raise serializers.ValidationError(
                f"Недопустимый формат файла: {', '.join(invalid_files)}. "
                f"Разрешены: {allowed_list}"
            )
        return files

    def create(self, validated_data):
        materials = validated_data.pop("materials", [])
        lesson = super().create(validated_data)
        if materials:
            LessonMaterial.objects.bulk_create(
                [LessonMaterial(lesson=lesson, file=item) for item in materials]
            )
        return lesson

    def to_representation(self, instance):
        return LessonReadSerializer(instance, context=self.context).data


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

    materials = serializers.ListField(
        child=serializers.FileField(),
        required=False,
        write_only=True,
    )

    class Meta:
        """Конфигурация сериализатора обновления урока."""
        model = Lesson
        fields = ['id', 'order', 'title', 'description', 'materials', 'duration']
        read_only_fields = ['id']

    def validate_materials(self, files):
        invalid_files = []
        allowed = set(ALLOWED_LESSON_MATERIAL_EXTENSIONS)
        for uploaded in files:
            name = uploaded.name or ""
            ext = name.rsplit(".", 1)[-1].lower() if "." in name else ""
            if ext not in allowed:
                invalid_files.append(name or "unknown")
        if invalid_files:
            allowed_list = ", ".join(sorted(allowed))
            raise serializers.ValidationError(
                f"Недопустимый формат файла: {', '.join(invalid_files)}. "
                f"Разрешены: {allowed_list}"
            )
        return files

    def update(self, instance, validated_data):
        materials = validated_data.pop("materials", [])
        lesson = super().update(instance, validated_data)
        if materials:
            LessonMaterial.objects.bulk_create(
                [LessonMaterial(lesson=lesson, file=item) for item in materials]
            )
        return lesson

    def to_representation(self, instance):
        return LessonReadSerializer(instance, context=self.context).data
