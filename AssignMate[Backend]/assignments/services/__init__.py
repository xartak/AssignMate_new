"""
Пакет сервисов приложения assignments.
"""

from .submit_assignment import SubmitAssignmentService
from .review_submission import ReviewSubmissionService

__all__ = [
    "SubmitAssignmentService",
    "ReviewSubmissionService",
]
