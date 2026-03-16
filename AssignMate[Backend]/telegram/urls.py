from django.urls import path
from .views import GenerateTelegramLinkView, VerifyTelegramTokenView

urlpatterns = [
    path(
        'telegram/generate-link/',
        GenerateTelegramLinkView.as_view(),
        name='generate-telegram-link',
    ),
    path(
        'telegram/verify/',
        VerifyTelegramTokenView.as_view(),
        name='verify-telegram-token',
    ),
]