from django.urls import path

from stats.views import (
    CourseStatsListView,
    CourseStatsDetailView,
    LessonStatsListView,
    LessonStatsDetailView,
    HomeworkStatsListView,
    HomeworkStatsDetailView,
    CourseStudentsStatsView,
    CourseStudentDetailView,
)

urlpatterns = [
    path("dashboard/courses/", CourseStatsListView.as_view(), name="course-stats-list"),
    path("dashboard/courses/<int:course_id>/", CourseStatsDetailView.as_view(), name="course-stats-detail"),
    path("dashboard/courses/<int:course_id>/lessons/", LessonStatsListView.as_view(), name="lesson-stats-list"),
    path("dashboard/courses/<int:course_id>/lessons/<int:lesson_order>/", LessonStatsDetailView.as_view(), name="lesson-stats-detail"),
    path("dashboard/courses/<int:course_id>/homeworks/", HomeworkStatsListView.as_view(), name="homework-stats-list"),
    path("dashboard/courses/<int:course_id>/homeworks/<int:homework_order>/", HomeworkStatsDetailView.as_view(), name="homework-stats-detail"),
    path("dashboard/courses/<int:course_id>/students/", CourseStudentsStatsView.as_view(), name="course-students-stats"),
    path("dashboard/courses/<int:course_id>/students/<int:student_id>/", CourseStudentDetailView.as_view(), name="course-student-stats-detail"),
]
