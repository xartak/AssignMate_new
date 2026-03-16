from django.db import migrations, models


class Migration(migrations.Migration):
    """Миграция добавления полей профиля пользователя."""

    dependencies = [
        ("accounts", "0002_user_first_name_user_last_name"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="patronymic",
            field=models.CharField(blank=True, max_length=150, verbose_name="Patronymic"),
        ),
        migrations.AddField(
            model_name="user",
            name="age",
            field=models.PositiveSmallIntegerField(blank=True, null=True, verbose_name="Age"),
        ),
        migrations.AddField(
            model_name="user",
            name="avatar",
            field=models.FileField(blank=True, null=True, upload_to="avatars/"),
        ),
        migrations.AddField(
            model_name="user",
            name="bio",
            field=models.TextField(blank=True),
        ),
    ]
