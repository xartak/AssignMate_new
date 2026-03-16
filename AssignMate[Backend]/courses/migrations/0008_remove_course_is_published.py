from django.db import migrations


class Migration(migrations.Migration):
    """Миграция удаления поля публикации курса."""
    dependencies = [
        ("courses", "0007_course_invite_code"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="course",
            name="is_published",
        ),
    ]
