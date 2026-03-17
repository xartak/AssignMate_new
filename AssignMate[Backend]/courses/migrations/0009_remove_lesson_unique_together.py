from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("courses", "0008_remove_course_is_published"),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name="lesson",
            unique_together=set(),
        ),
    ]
