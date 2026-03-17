#!/bin/sh
set -e

if [ -n "${DATABASE_URL:-}" ] || [ -n "${DATABASE_NAME:-}" ]; then
  echo "Waiting for database..."
  python - <<'PY'
import os
import time

import psycopg

dsn = os.environ.get("DATABASE_URL")
if not dsn:
    name = os.environ.get("DATABASE_NAME")
    user = os.environ.get("DATABASE_USER")
    password = os.environ.get("DATABASE_PASSWORD")
    host = os.environ.get("DATABASE_HOST", "localhost")
    port = os.environ.get("DATABASE_PORT", "5432")
    if name and user and password:
        dsn = f"postgresql://{user}:{password}@{host}:{port}/{name}"

if not dsn:
    raise SystemExit("DATABASE_URL is not set and DATABASE_* variables are incomplete.")

for _ in range(30):
    try:
        with psycopg.connect(dsn, connect_timeout=3):
            break
    except Exception:
        time.sleep(2)
else:
    raise SystemExit("Database is not ready after 60 seconds.")
PY
fi

echo "Applying migrations..."
python manage.py migrate --noinput

if [ "${DJANGO_COLLECTSTATIC:-0}" = "1" ]; then
  echo "Collecting static..."
  python manage.py collectstatic --noinput
fi

if [ -n "${DJANGO_SUPERUSER_EMAIL:-}" ] && [ -n "${DJANGO_SUPERUSER_PASSWORD:-}" ]; then
  echo "Ensuring superuser..."
  python - <<'PY'
import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django

django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()
email = os.environ.get("DJANGO_SUPERUSER_EMAIL")
password = os.environ.get("DJANGO_SUPERUSER_PASSWORD")
first_name = os.environ.get("DJANGO_SUPERUSER_FIRST_NAME", "")
last_name = os.environ.get("DJANGO_SUPERUSER_LAST_NAME", "")

if email and password and not User.objects.filter(email=email).exists():
    User.objects.create_superuser(
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
    )
PY
fi

exec "$@"
