from django.urls import path

from .views import (
    RegisterAPIView,
    LoginAPIView,
    RefreshAPIView,
    LogoutAPIView,
    MeAPIView,
    ParentChildrenAPIView,
)

urlpatterns = [
    path("auth/register/", RegisterAPIView.as_view(), name="api-register"),
    path("auth/login/", LoginAPIView.as_view(), name="api-login"),
    path("auth/refresh/", RefreshAPIView.as_view(), name="api-refresh"),
    path("auth/logout/", LogoutAPIView.as_view(), name="api-logout"),
    path("auth/me/", MeAPIView.as_view(), name="api-me"),
    path("auth/children/", ParentChildrenAPIView.as_view(), name="api-children"),
    path("auth/children/<int:link_id>/", ParentChildrenAPIView.as_view(), name="api-children-delete"),
]
