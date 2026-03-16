from rest_framework import serializers

from courses.models import Enrollment


class EnrollmentSerializer(serializers.ModelSerializer):
    """Сериализатор зачисления на курс.

    Attributes:
        id: Идентификатор записи зачисления.
        student: Идентификатор студента.
        course: Идентификатор курса.
        status: Статус зачисления.
        enrolled_at: Дата зачисления.
    """

    class Meta:
        """Конфигурация сериализатора зачисления."""
        model = Enrollment
        fields = "__all__"
