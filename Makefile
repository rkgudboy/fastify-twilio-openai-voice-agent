.PHONY: help install dev start docker-up docker-down docker-logs docker-restart clean test

help:
	@echo "Voice AI Agent - Fastify Implementation"
	@echo ""
	@echo "Available commands:"
	@echo "  make install          - Install dependencies"
	@echo "  make dev              - Run in development mode with auto-reload"
	@echo "  make start            - Run in production mode"
	@echo "  make docker-up        - Start all services with Docker Compose"
	@echo "  make docker-down      - Stop Docker Compose services"
	@echo "  make docker-logs      - View Docker Compose logs"
	@echo "  make docker-restart   - Restart Docker Compose services"
	@echo "  make clean            - Clean node_modules and temporary files"
	@echo "  make test             - Run tests"

install:
	npm install

dev:
	node --watch src/server.js

start:
	node src/server.js

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f

docker-restart:
	docker-compose restart api

clean:
	rm -rf node_modules
	rm -rf package-lock.json
	find . -name "*.log" -delete

test:
	@echo "No tests configured yet"
