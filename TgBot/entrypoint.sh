#!/bin/sh
set -e

echo "Running bot migrations..."
alembic -c /app/alembic.ini upgrade head

exec "$@"
