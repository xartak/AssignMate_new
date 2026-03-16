from rest_framework import serializers


class CourseStatsListSerializer(serializers.Serializer):
    """Сериализатор списка курсов со статистикой.

    Attributes:
        id: Идентификатор курса.
        title: Название курса.
        students_count: Количество активных студентов.
    """
    id = serializers.IntegerField()
    title = serializers.CharField()
    students_count = serializers.IntegerField()


class CourseStatsDetailSerializer(serializers.Serializer):
    """Сериализатор детальной статистики курса.

    Attributes:
        id: Идентификатор курса.
        title: Название курса.
        students_count: Количество активных студентов.
        lessons_count: Количество уроков.
        homeworks_count: Количество домашних заданий.
        total_max_score: Суммарный максимальный балл.
    """
    id = serializers.IntegerField()
    title = serializers.CharField()
    students_count = serializers.IntegerField()
    lessons_count = serializers.IntegerField()
    homeworks_count = serializers.IntegerField()
    total_max_score = serializers.IntegerField()


class LessonStatsListSerializer(serializers.Serializer):
    """Сериализатор статистики по урокам (краткий)."""
    id = serializers.IntegerField()
    order = serializers.IntegerField()
    title = serializers.CharField()
    homeworks_max_score_sum = serializers.IntegerField()
    completion_percent_score = serializers.FloatField()


class LessonStatsDetailSerializer(serializers.Serializer):
    """Сериализатор детальной статистики по уроку."""
    id = serializers.IntegerField()
    order = serializers.IntegerField()
    title = serializers.CharField()
    students_count = serializers.IntegerField()
    homeworks_count = serializers.IntegerField()
    total_max_score = serializers.IntegerField()
    submissions_count = serializers.IntegerField()
    reviewed_count = serializers.IntegerField()
    score_sum = serializers.IntegerField()
    avg_score = serializers.FloatField()
    completion_percent_submissions = serializers.FloatField()
    completion_percent_score = serializers.FloatField()


class HomeworkStatsListSerializer(serializers.Serializer):
    """Сериализатор статистики по домашним заданиям (краткий)."""
    id = serializers.IntegerField()
    order = serializers.IntegerField()
    title = serializers.CharField()
    max_score = serializers.IntegerField()
    submissions_count = serializers.IntegerField()
    reviewed_count = serializers.IntegerField()
    completion_percent_score = serializers.FloatField()


class StudentHomeworkStatsSerializer(serializers.Serializer):
    """Сериализатор статистики студента по конкретному заданию."""
    student_id = serializers.IntegerField()
    email = serializers.EmailField()
    first_name = serializers.CharField(allow_blank=True)
    last_name = serializers.CharField(allow_blank=True)
    score = serializers.IntegerField()
    percent = serializers.FloatField()
    has_submission = serializers.BooleanField()


class HomeworkStatsDetailSerializer(serializers.Serializer):
    """Сериализатор детальной статистики по домашнему заданию."""
    id = serializers.IntegerField()
    order = serializers.IntegerField()
    title = serializers.CharField()
    max_score = serializers.IntegerField()
    students_count = serializers.IntegerField()
    submissions_count = serializers.IntegerField()
    reviewed_count = serializers.IntegerField()
    score_sum = serializers.IntegerField()
    completion_percent_score = serializers.FloatField()
    students = StudentHomeworkStatsSerializer(many=True)


class CourseStudentStatsSerializer(serializers.Serializer):
    """Сериализатор статистики по студенту курса (краткий)."""
    student_id = serializers.IntegerField()
    email = serializers.EmailField()
    first_name = serializers.CharField(allow_blank=True)
    last_name = serializers.CharField(allow_blank=True)
    submissions_count = serializers.IntegerField()
    reviewed_count = serializers.IntegerField()
    score_sum = serializers.IntegerField()
    completion_percent_score = serializers.FloatField()
    completion_percent_submissions = serializers.FloatField()
    last_submission_at = serializers.DateTimeField(allow_null=True)


class CourseStudentHomeworkSerializer(serializers.Serializer):
    """Сериализатор задания в разрезе студента курса."""
    homework_id = serializers.IntegerField()
    lesson_order = serializers.IntegerField()
    lesson_title = serializers.CharField()
    title = serializers.CharField()
    deadline = serializers.DateTimeField(allow_null=True)
    status = serializers.CharField()
    score = serializers.IntegerField(allow_null=True)


class CourseStudentDetailSerializer(serializers.Serializer):
    """Сериализатор детальной статистики по студенту курса."""
    course_id = serializers.IntegerField()
    course_title = serializers.CharField()
    student_id = serializers.IntegerField()
    email = serializers.EmailField()
    first_name = serializers.CharField(allow_blank=True)
    last_name = serializers.CharField(allow_blank=True)
    homeworks_count = serializers.IntegerField()
    total_max_score = serializers.IntegerField()
    submissions_count = serializers.IntegerField()
    score_sum = serializers.IntegerField()
    on_time_count = serializers.IntegerField()
    homeworks = CourseStudentHomeworkSerializer(many=True)
