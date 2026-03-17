"""Admin registrations for courses app."""

from django.contrib import admin

from courses.models import Course, Lesson, Enrollment, CourseStaff


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "author", "invite_code", "created_at", "updated_at", "deleted")
    search_fields = ("title", "author__email")
    list_filter = ("author", "created_at", "deleted")
    readonly_fields = ("created_at", "updated_at")


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ("id", "course", "order", "title", "duration", "created_at", "deleted")
    search_fields = ("title", "course__title")
    list_filter = ("course", "created_at", "deleted")
    readonly_fields = ("created_at", "updated_at")
    ordering = ("course", "order")


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ("id", "student", "course", "status", "enrolled_at")
    search_fields = ("student__email", "course__title")
    list_filter = ("status", "enrolled_at")
    readonly_fields = ("created_at", "updated_at", "enrolled_at")


@admin.register(CourseStaff)
class CourseStaffAdmin(admin.ModelAdmin):
    list_display = ("id", "course", "user", "role", "created_at")
    search_fields = ("course__title", "user__email")
    list_filter = ("role", "created_at")
    readonly_fields = ("created_at", "updated_at")
