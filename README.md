# AssignMate

Django + DRF проект для управления курсами, уроками и домашними заданиями.

## Требования
- Python 3.12.6
- Poetry

## Установка
```bash
poetry install
```

## Переменные окружения (опционально)
- `CORS_ALLOWED_ORIGINS` — список origin через запятую
- `CSRF_TRUSTED_ORIGINS` — список origin через запятую

Если не заданы — CORS/CSRF будут пустыми.

## Миграции
```bash
poetry run python AssignMate[Backend]/manage.py migrate
```

## Создание суперпользователя
```bash
poetry run python AssignMate[Backend]/manage.py createsuperuser
```

## Запуск сервера
```bash
poetry run python AssignMate[Backend]/manage.py runserver
```

По умолчанию используется SQLite: `AssignMate/db.sqlite3`.

## API
Базовый путь: `http://localhost:8000/api/v1/`

Основные группы:
- Auth: `/auth/*`
- Courses: `/courses/*`
- Lessons: `/courses/<course_id>/lessons/<lesson_order>/` (используется `order` урока)
- Homeworks: `/courses/<course_id>/lessons/<lesson_order>/homeworks/<homework_order>/`
- Submissions: `/courses/<course_id>/lessons/<lesson_order>/homeworks/<homework_order>/submissions/*`
- Dashboard: `/dashboard/`
- Stats: `/dashboard/courses/*`

## Postman
Коллекция запросов находится в `AssignMate.postman_collection.json`.
Импортируйте её в Postman и используйте переменные коллекции.
