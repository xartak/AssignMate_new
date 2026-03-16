from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import path, include

from debug_toolbar.toolbar import debug_toolbar_urls

urlpatterns = [
    path('admin/', admin.site.urls),

    path('api/v1/', include('courses.urls')),
    path('api/v1/', include('assignments.urls')),
    path('api/v1/', include('stats.urls')),

    path('api/v1/', include('accounts.urls')),

    path('api/v1/', include('telegram.urls')),

    path('api/v1/', include('rest_framework.urls', namespace='rest_framework')),
] + debug_toolbar_urls()

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
