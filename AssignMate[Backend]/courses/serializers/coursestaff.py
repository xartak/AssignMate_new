from rest_framework import serializers

from courses.models import CourseStaff


class CourseStaffSerializer(serializers.ModelSerializer):
    """Сериализатор участника курса.

    Attributes:
        id: Идентификатор записи staff.
        course: Идентификатор курса.
        user: Идентификатор пользователя.
        role: Роль пользователя в курсе.
    """

    class Meta:
        """Конфигурация сериализатора участника курса."""
        model = CourseStaff
        fields = "__all__"
