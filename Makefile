.PHONY: up up-d down build logs backend-up frontend-up db-up backend-stop frontend-stop db-stop

up:
	docker compose up

up-d:
	docker compose up -d --build

down:
	docker compose down

build:
	docker compose build

logs:
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
