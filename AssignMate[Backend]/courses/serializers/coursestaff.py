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


class AssistantPermissionsSerializer(serializers.ModelSerializer):
    """Сериализатор флагов разрешений ассистента курса.

    Attributes:
        user_id: Идентификатор записи staff.
        email: Идентификатор курса.
        first_name: Идентификатор пользователя.
        last_name: Роль пользователя в курсе.
    """
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    first_name = serializers.CharField(source="user.first_name", read_only=True, allow_null=True)
    last_name = serializers.CharField(source="user.last_name", read_only=True, allow_null=True)

    class Meta:
        """Конфигурация сериализатора флагов ассистента."""
        model = CourseStaff
        fields = [
            "user_id",
            "email",
            "first_name",
            "last_name",
            "can_edit_homework",
            "can_review_homework",
            "can_add_homework",
            "can_add_materials",
        ]
        read_only_fields = ["user_id", "email", "first_name", "last_name"]
