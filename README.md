# AssignMate

Django + DRF проект для управления курсами, уроками и домашними заданиями.

## Быстрый старт (Docker)
```bash
make compose-up
```

Доступ:
- API: `http://localhost:8000/api/v1/`
- Frontend: `http://localhost:5173/`

## Автоматика при старте backend
- Миграции запускаются автоматически при старте контейнера.
- Суперпользователь создаётся автоматически, если заданы переменные:
  `DJANGO_SUPERUSER_EMAIL`, `DJANGO_SUPERUSER_PASSWORD`,
  `DJANGO_SUPERUSER_FIRST_NAME`, `DJANGO_SUPERUSER_LAST_NAME`.

## Переменные окружения
Backend использует файл [`.env`](/home/artem/Assign/AssignMate%5BBackend%5D/.env). Обязательные ключи:
- `SECRET_KEY`
- `DEBUG`
- `ALLOWED_HOSTS`
- `DATABASE_NAME`
- `DATABASE_USER`
- `DATABASE_PASSWORD`
- `DATABASE_HOST`
- `DATABASE_PORT`

Опциональные ключи:
- `CORS_ALLOWED_ORIGINS`
- `CSRF_TRUSTED_ORIGINS`
- `CORS_ALLOW_CREDENTIALS`
- `JWT_ACCESS_MINUTES`
- `JWT_REFRESH_DAYS`
- `JWT_ROTATE_REFRESH`
- `JWT_BLACKLIST_AFTER_ROTATION`
- `DJANGO_SUPERUSER_EMAIL`
- `DJANGO_SUPERUSER_PASSWORD`
- `DJANGO_SUPERUSER_FIRST_NAME`
- `DJANGO_SUPERUSER_LAST_NAME`

## Локальный запуск без Docker
```bash
cd AssignMate[Backend]
poetry install
poetry run python manage.py migrate
poetry run python manage.py runserver
```

## Makefile
Основные команды:
```bash
make compose-up
make compose-down
make backend-up
make frontend-up
make db-up
```

## API
Базовый путь: `http://localhost:8000/api/v1/`

Основные группы:
- Auth: `/auth/*`
- Courses: `/courses/*`
- Lessons: `/courses/<course_id>/lessons/<lesson_order>/`
- Homeworks: `/courses/<course_id>/lessons/<lesson_order>/homeworks/<homework_order>/`
- Submissions: `/courses/<course_id>/lessons/<lesson_order>/homeworks/<homework_order>/submissions/*`
- Dashboard: `/dashboard/`
- Stats: `/dashboard/courses/*`

## Postman
Коллекция запросов находится в `AssignMate.postman_collection.json`.
Импортируйте её в Postman и используйте переменные коллекции (`base_url` и т.д.).
