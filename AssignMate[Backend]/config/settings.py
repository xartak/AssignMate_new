import os
import environ
from datetime import timedelta
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent
env = environ.Env(
    BACKEND_DJANGO_DEBUG=(bool, True),
    BACKEND_CORS_ALLOW_CREDENTIALS=(bool, False),
    BACKEND_JWT_ACCESS_MINUTES=(int, 180),
    BACKEND_JWT_REFRESH_DAYS=(int, 7),
    BACKEND_JWT_ROTATE_REFRESH=(bool, True),
    BACKEND_JWT_BLACKLIST_AFTER_ROTATION=(bool, True),
)
environ.Env.read_env(BASE_DIR / ".env")

SECRET_KEY = env("BACKEND_DJANGO_SECRET_KEY")

DEBUG = env("BACKEND_DJANGO_DEBUG")

ALLOWED_HOSTS = env.list("BACKEND_DJANGO_ALLOWED_HOSTS")
INTERNAL_IPS = env.list("BACKEND_TOOLBAR_INTERNAL_IPS")


INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    'debug_toolbar',

    'corsheaders',

    'rest_framework',
    'rest_framework_simplejwt.token_blacklist',
    'safedelete',

    'common.apps.CommonConfig',
    'accounts.apps.AccountsConfig',
    'courses.apps.CoursesConfig',
    'assignments.apps.AssignmentsConfig',
    'stats.apps.StatsConfig',
    'telegram.apps.TelegramConfig',
]


REST_FRAMEWORK = {
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 10,
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
    ),
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=env("BACKEND_JWT_ACCESS_MINUTES")),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=env("BACKEND_JWT_REFRESH_DAYS")),
    'ROTATE_REFRESH_TOKENS': env("BACKEND_JWT_ROTATE_REFRESH"),
    'BLACKLIST_AFTER_ROTATION': env("BACKEND_JWT_BLACKLIST_AFTER_ROTATION"),
    'AUTH_HEADER_TYPES': ('Bearer',),
}

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',

    'debug_toolbar.middleware.DebugToolbarMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [
            BASE_DIR / 'templates',
        ],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': env("BACKEND_DATABASE_NAME"),
        'USER': env("BACKEND_DATABASE_USER"),
        'PASSWORD': env("BACKEND_DATABASE_PASSWORD"),
        'HOST': env("BACKEND_DATABASE_HOST"),
        'PORT': env("BACKEND_DATABASE_PORT"),
    }
}

AUTH_USER_MODEL = "accounts.User"
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True


STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'static')
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

CORS_ALLOWED_ORIGINS = env.list('BACKEND_CORS_ALLOWED_ORIGINS')
CORS_ALLOW_CREDENTIALS = env('BACKEND_CORS_ALLOW_CREDENTIALS')
CSRF_TRUSTED_ORIGINS = env.list('BACKEND_CSRF_TRUSTED_ORIGINS')

TELEGRAM_BOT_TOKEN = env('BACKEND_TELEGRAM_BOT_TOKEN')
TELEGRAM_BOT_USERNAME = env('BACKEND_TELEGRAM_BOT_USERNAME')
BOT_SERVICE_TOKEN = env('BACKEND_TELEGRAM_BOT_SERVICE_TOKEN')