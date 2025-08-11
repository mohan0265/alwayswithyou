.PHONY: dev seed test build clean install lint typecheck

# Install dependencies
install:
	pnpm install

# Development - start all services
dev: install
	@echo "Starting AWY development environment..."
	@echo "Starting Supabase (if available)..."
	-docker-compose up -d supabase 2>/dev/null || echo "Supabase not configured, skipping..."
	@echo "Starting all development servers..."
	pnpm dev

# Seed database with demo data
seed:
	@echo "Seeding database with demo data..."
	pnpm --filter server seed

# Run all tests
test:
	@echo "Running all tests..."
	pnpm test

# Build all packages and apps
build:
	@echo "Building all packages and apps..."
	pnpm build

# Clean all build artifacts
clean:
	@echo "Cleaning build artifacts..."
	pnpm clean
	find . -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
	find . -name "dist" -type d -exec rm -rf {} + 2>/dev/null || true
	find . -name "build" -type d -exec rm -rf {} + 2>/dev/null || true

# Lint all code
lint:
	@echo "Linting all code..."
	pnpm lint

# Type check all code
typecheck:
	@echo "Type checking all code..."
	pnpm typecheck

# Setup development environment
setup: install
	@echo "Setting up development environment..."
	@if [ ! -f .env ]; then cp .env.example .env; echo "Created .env file from .env.example"; fi
	@echo "Setup complete! Run 'make dev' to start development."

# Help
help:
	@echo "Available commands:"
	@echo "  make setup     - Setup development environment"
	@echo "  make dev       - Start development servers"
	@echo "  make seed      - Seed database with demo data"
	@echo "  make test      - Run all tests"
	@echo "  make build     - Build all packages and apps"
	@echo "  make clean     - Clean build artifacts"
	@echo "  make lint      - Lint all code"
	@echo "  make typecheck - Type check all code"

