from django.db import migrations, models
import django.db.models.deletion
import django.core.validators


class Migration(migrations.Migration):

    dependencies = [
        ("courses", "0009_remove_lesson_unique_together"),
    ]

    operations = [
        migrations.CreateModel(
            name="LessonMaterial",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "file",
                    models.FileField(
                        upload_to="lesson_materials/",
                        validators=[
                            django.core.validators.FileExtensionValidator(
                                [
                                    "pdf",
                                    "doc",
                                    "docx",
                                    "ppt",
                                    "pptx",
                                    "xls",
                                    "xlsx",
                                    "txt",
                                    "png",
                                    "jpg",
                                    "jpeg",
                                    "gif",
                                    "mp4",
                                    "mp3",
                                    "wav",
                                    "zip",
                                ]
                            )
                        ],
                    ),
                ),
                (
                    "lesson",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="materials_files",
                        to="courses.lesson",
                    ),
                ),
            ],
            options={
                "ordering": ["id"],
                "verbose_name": "Lesson material",
                "verbose_name_plural": "Lesson materials",
            },
        ),
    ]
