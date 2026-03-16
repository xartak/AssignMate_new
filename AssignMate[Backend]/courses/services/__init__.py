"""
Пакет сервисов приложения courses.
"""

from .invite_code import generate_invite_code
from .join_course import join_course

__all__ = [
    "generate_invite_code",
    "join_course",
]
