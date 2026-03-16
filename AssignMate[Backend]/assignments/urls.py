from django.urls import path, include
from rest_framework_nested import routers

from courses.urls import lesson_router
from assignments.views import HomeworkViewSet, SubmissionViewSet

homework_router = routers.NestedSimpleRouter(lesson_router, r'lessons', lookup='lesson')
homework_router.register(r'homeworks', HomeworkViewSet, basename='homework')

submission_router = routers.NestedSimpleRouter(homework_router, r'homeworks', lookup='homework')
submission_router.register(r'submissions', SubmissionViewSet, basename='submission')

urlpatterns = [
    path('', include(homework_router.urls)),
    path('', include(submission_router.urls)),
]
