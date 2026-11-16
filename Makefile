SHELL := /usr/bin/env bash

COMPOSE := docker compose --env-file .env -f infra/docker-compose.yml

.PHONY: setup install dev dev-infra build up down logs ps restart migrate seed \
	backup monitoring mlflow test test-api test-ml test-e2e lint typecheck check format clean config

setup: ## Generate .env with strong secrets
	@./scripts/setup.sh

install: ## Install JavaScript dependencies
	pnpm install

dev: ## Run web + API locally (requires Postgres, Redis, MinIO and the ML service)
	pnpm dev

dev-infra: ## Start only the local infrastructure dependencies
	$(COMPOSE) up -d postgres redis minio minio-init

build: ## Build all JavaScript apps
	pnpm build

up: ## Start the full stack with Docker Compose
	$(COMPOSE) up -d --build

down: ## Stop the stack (keeps volumes)
	$(COMPOSE) down

logs: ## Follow logs
	$(COMPOSE) logs -f --tail=200

ps: ## Show service status
	$(COMPOSE) ps

restart: ## Restart API and worker
	$(COMPOSE) restart api worker

migrate: ## Apply database migrations in Docker
	$(COMPOSE) exec api ./node_modules/.bin/prisma migrate deploy

seed: ## Seed the bootstrap admin and default model
	$(COMPOSE) exec api node prisma/seed.js

backup: ## Start the optional database and object-storage backup loops
	$(COMPOSE) --profile backup up -d backup-db backup-media

monitoring: ## Start Prometheus and Grafana (loopback only)
	$(COMPOSE) --profile monitoring up -d

mlflow: ## Start the optional MLflow tracking server
	$(COMPOSE) --profile mlflow up -d mlflow

test: test-api test-ml ## Run API and ML test suites

test-api: ## Run NestJS unit tests
	pnpm --filter @deepfake/api test

test-ml: ## Run FastAPI/ML tests
	cd services/ml && python -m pytest -q

test-e2e: ## Run Playwright tests (build the web app first)
	pnpm --filter @deepfake/web test:e2e

lint: ## Lint all apps
	pnpm lint

typecheck: ## Typecheck all apps
	pnpm typecheck

check: typecheck lint test ## Typecheck, lint and test everything

format: ## Format the repository
	pnpm format

config: ## Validate the Compose file without starting services
	$(COMPOSE) config --quiet

clean: ## Remove build artifacts and local volumes (DESTRUCTIVE)
	rm -rf apps/web/.next apps/api/dist services/ml/.pytest_cache apps/web/playwright-report apps/web/test-results
	$(COMPOSE) down -v
