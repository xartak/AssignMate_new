#!/bin/sh
set -e

echo "Running VKBot migrations..."
alembic -c /app/alembic.ini upgrade head

exec "$@"
