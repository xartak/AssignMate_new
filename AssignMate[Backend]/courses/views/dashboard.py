from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated

from courses.selectors import courses_for_dashboard
from courses.serializers import CourseReadSerializer


class DashboardView(ListAPIView):
    """
    API endpoint для личного кабинета.

    Возвращает список курсов в зависимости от роли пользователя.
    """
    serializer_class = CourseReadSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Возвращает набор курсов для текущего пользователя.

        Returns:
            QuerySet: Список курсов, доступных пользователю.
        """
        return courses_for_dashboard(self.request.user)
