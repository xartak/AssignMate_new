import os

from django.core.validators import FileExtensionValidator
from django.db import models

from common.models import TimeStampedModel
from courses.constants import ALLOWED_LESSON_MATERIAL_EXTENSIONS


class LessonMaterial(TimeStampedModel):
    lesson = models.ForeignKey(
        "courses.Lesson",
        on_delete=models.CASCADE,
        related_name="materials_files",
    )
    file = models.FileField(
        upload_to="lesson_materials/",
        validators=[FileExtensionValidator(ALLOWED_LESSON_MATERIAL_EXTENSIONS)],
    )

    class Meta:
        ordering = ["id"]
        verbose_name = "Lesson material"
        verbose_name_plural = "Lesson materials"

    def __str__(self) -> str:
        return os.path.basename(self.file.name)
