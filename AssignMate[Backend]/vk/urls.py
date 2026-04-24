from django.urls import path

from .views import GenerateVKCodeView, VerifyVKCodeView

urlpatterns = [
    path(
        "vk/generate-code/",
        GenerateVKCodeView.as_view(),
        name="generate-vk-code",
    ),
    path(
        "vk/verify/",
        VerifyVKCodeView.as_view(),
        name="verify-vk-code",
    ),
]
