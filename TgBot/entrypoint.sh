#!/bin/sh
set -e

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required"
  exit 1
fi

echo "Waiting for database..."
python - <<'PY'
import asyncio
import os

import asyncpg

dsn = os.environ["DATABASE_URL"]
if "+asyncpg" in dsn:
    dsn = dsn.replace("+asyncpg", "")

async def check():
    for _ in range(30):
        try:
            conn = await asyncpg.connect(dsn)
            await conn.close()
            return True
        except Exception:
            await asyncio.sleep(2)
    return False

ok = asyncio.run(check())
if not ok:
    raise SystemExit("Database is not ready after 60 seconds.")
PY

echo "Running bot migrations..."
alembic -c /app/alembic.ini upgrade head

exec "$@"
