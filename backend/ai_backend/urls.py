"""
URL configuration for ai_backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse

def api_root(request):
    """API root endpoint with available endpoints."""
    return JsonResponse({
        'message': 'Welcome to Mentora AI Study Assistant API',
        'version': '1.0',
        'endpoints': {
            'documents': '/api/reader/documents/',
            'upload': '/api/reader/upload/',
            'chat_sessions': '/api/chat/sessions/',
            'analytics': '/api/analytics/study-time/',
            'admin': '/admin/',
        },
        'frontend': 'http://localhost:3000',
        'status': 'running'
    })

urlpatterns = [
    path('', api_root, name='api_root'),
    path('api/', api_root, name='api_root_alt'),
    path('admin/', admin.site.urls),
    path('api/reader/', include('reader.urls')),
    path('api/chat/', include('chat.urls')),
    path('api/analytics/', include('analytics.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
