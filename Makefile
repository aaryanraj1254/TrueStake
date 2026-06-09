# TrueStake — common tasks. Run `make help` for the list.
# (On Windows, install make via `choco install make`, or just run the underlying
#  commands shown in DEPLOY.md.)

.PHONY: help install dev build test typecheck lint up up-dev down logs ps clean push

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	  awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

install: ## Install deps
	pnpm install

dev: ## Run web + api locally (hot reload)
	pnpm dev

build: ## Build everything
	pnpm build

test: ## Run tests
	pnpm test

typecheck: ## Typecheck the repo
	pnpm typecheck

lint: ## Lint
	pnpm lint

up: ## Production docker stack (build + detach)
	docker-compose -f docker-compose.yml up -d --build

up-dev: ## Dev docker stack (hot reload)
	docker-compose up

down: ## Stop the stack
	docker-compose down

logs: ## Tail api logs
	docker-compose logs -f api

ps: ## Show running services
	docker-compose ps

clean: ## Remove build artifacts
	rm -rf apps/*/dist node_modules/.cache .turbo

push: ## Push to GitHub main
	git push origin main
