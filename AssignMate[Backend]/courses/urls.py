from django.urls import path, include
from rest_framework_nested import routers

from .views import CourseViewSet
from .views.lessons import LessonViewSet
from .views.dashboard import DashboardView

course_router = routers.SimpleRouter()
course_router.register(r'courses', CourseViewSet, basename='course')

lesson_router = routers.NestedSimpleRouter(course_router, r'courses', lookup='course')
lesson_router.register(r'lessons', LessonViewSet, basename='lesson')

urlpatterns = [
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('', include(course_router.urls)),
    path('', include(lesson_router.urls)),
]
