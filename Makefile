.PHONY: compose-up compose-up-d compose-down compose-build compose-logs backend-up frontend-up db-up backend-stop frontend-stop db-stop

compose-up:
	docker compose up --build

compose-up-d:
	docker compose up -d --build

compose-down:
	docker compose down

compose-build:
	docker compose build

compose-logs:
	docker compose logs -f --tail=200

backend-up:
	docker compose up --build backend

frontend-up:
	docker compose up --build frontend

db-up:
	docker compose up --build db

backend-stop:
	docker compose stop backend

frontend-stop:
	docker compose stop frontend

db-stop:
	docker compose stop db
