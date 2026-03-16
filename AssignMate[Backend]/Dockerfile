FROM python:3.12.6-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir poetry

COPY pyproject.toml poetry.lock /app/
RUN poetry config virtualenvs.create false \
    && poetry install --no-root --only main

COPY . /app

WORKDIR /app
EXPOSE 8000

FROM base AS dev
CMD ["poetry", "run", "python", "manage.py", "runserver", "0.0.0.0:8000"]

FROM base AS stage
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000"]
