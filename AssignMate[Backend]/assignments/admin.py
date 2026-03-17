"""Admin registrations for assignments app."""

from django.contrib import admin

from assignments.models import (
    Assignment,
    SingleChoiceAssignment,
    MultipleChoiceAssignment,
    FillBlankAssignment,
    FillBlankItem,
    ShortAnswerAssignment,
    LongAnswerAssignment,
    QuestionOption,
    Submission,
    SubmissionFile,
    Review,
    SingleChoiceSubmission,
    MultipleChoiceSubmission,
    FillBlankSubmission,
    FillBlankAnswer,
    ShortAnswerSubmission,
    LongAnswerSubmission,
)


@admin.register(Assignment)
class AssignmentAdmin(admin.ModelAdmin):
    list_display = ("id", "lesson", "order", "title", "type", "max_score", "deadline", "deleted")
    list_filter = ("type", "lesson", "deadline", "deleted")
    search_fields = ("title", "lesson__title", "lesson__course__title")
    readonly_fields = ("created_at", "updated_at")
    ordering = ("lesson", "order")


@admin.register(QuestionOption)
class QuestionOptionAdmin(admin.ModelAdmin):
    list_display = ("id", "assignment", "text", "is_correct")
    list_filter = ("is_correct",)
    search_fields = ("text", "assignment__title")


@admin.register(SingleChoiceAssignment)
class SingleChoiceAssignmentAdmin(admin.ModelAdmin):
    list_display = ("id", "assignment", "shuffle_options")
    list_filter = ("shuffle_options",)


@admin.register(MultipleChoiceAssignment)
class MultipleChoiceAssignmentAdmin(admin.ModelAdmin):
    list_display = ("id", "assignment", "shuffle_options")
    list_filter = ("shuffle_options",)


@admin.register(FillBlankAssignment)
class FillBlankAssignmentAdmin(admin.ModelAdmin):
    list_display = ("id", "assignment")
    search_fields = ("assignment__title",)


@admin.register(FillBlankItem)
class FillBlankItemAdmin(admin.ModelAdmin):
    list_display = ("id", "fill_blank", "position", "correct_text")
    search_fields = ("fill_blank__assignment__title", "correct_text")
    list_filter = ("position",)


@admin.register(ShortAnswerAssignment)
class ShortAnswerAssignmentAdmin(admin.ModelAdmin):
    list_display = ("id", "assignment", "max_length", "case_sensitive")
    list_filter = ("case_sensitive",)


@admin.register(LongAnswerAssignment)
class LongAnswerAssignmentAdmin(admin.ModelAdmin):
    list_display = ("id", "assignment", "max_files")


@admin.register(Submission)
class SubmissionAdmin(admin.ModelAdmin):
    list_display = ("id", "assignment", "student", "status", "timeliness_status", "created_at")
    list_filter = ("status", "timeliness_status", "created_at")
    search_fields = ("student__email", "assignment__title")
    readonly_fields = ("created_at", "updated_at")


@admin.register(SubmissionFile)
class SubmissionFileAdmin(admin.ModelAdmin):
    list_display = ("id", "submission", "file", "created_at")
    search_fields = ("submission__student__email", "submission__assignment__title")
    readonly_fields = ("created_at", "updated_at")


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("id", "submission", "reviewer", "score", "created_at")
    search_fields = ("submission__assignment__title", "reviewer__email")
    readonly_fields = ("created_at", "updated_at")


@admin.register(SingleChoiceSubmission)
class SingleChoiceSubmissionAdmin(admin.ModelAdmin):
    list_display = ("id", "submission", "selected_option")


@admin.register(MultipleChoiceSubmission)
class MultipleChoiceSubmissionAdmin(admin.ModelAdmin):
    list_display = ("id", "submission")


@admin.register(FillBlankSubmission)
class FillBlankSubmissionAdmin(admin.ModelAdmin):
    list_display = ("id", "submission")


@admin.register(FillBlankAnswer)
class FillBlankAnswerAdmin(admin.ModelAdmin):
    list_display = ("id", "submission", "position", "answer_text")


@admin.register(ShortAnswerSubmission)
class ShortAnswerSubmissionAdmin(admin.ModelAdmin):
    list_display = ("id", "submission", "answer_text")


@admin.register(LongAnswerSubmission)
class LongAnswerSubmissionAdmin(admin.ModelAdmin):
    list_display = ("id", "submission")
