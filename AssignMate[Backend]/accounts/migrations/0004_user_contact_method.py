from django.db import migrations, models


class Migration(migrations.Migration):
    """Миграция добавления способа связи пользователя."""

    dependencies = [
        ("accounts", "0003_user_profile_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="contact_method",
            field=models.CharField(blank=True, max_length=120, verbose_name="Contact method"),
        ),
    ]
