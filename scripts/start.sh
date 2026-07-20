#!/usr/bin/env bash
# Start the entire Silent Review development stack in one command.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PROJECT_ROOT}"

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${BLUE}[silent-review]${NC} $1"; }
success() { echo -e "${GREEN}[silent-review]${NC} $1"; }
warn() { echo -e "${YELLOW}[silent-review]${NC} $1"; }
error() { echo -e "${RED}[silent-review]${NC} $1"; }

if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    log "Creating .env from .env.example"
    cp .env.example .env
  else
    error ".env.example not found. Cannot create .env"
    exit 1
  fi
else
  log ".env already exists"
fi

if [ ! -d "node_modules" ]; then
  log "Installing dependencies..."
  pnpm install
else
  log "Dependencies already installed"
fi

log "Starting PostgreSQL and Redis..."
docker compose up -d

log "Waiting for PostgreSQL to be healthy..."
for i in {1..30}; do
  if docker exec silent-review-postgres pg_isready -U postgres -d silent_review >/dev/null 2>&1; then
    success "PostgreSQL is ready"
    break
  fi
  if [ "$i" -eq 30 ]; then
    error "PostgreSQL did not become healthy in time"
    exit 1
  fi
  sleep 1
done

log "Generating Prisma client..."
pnpm exec dotenv -e .env -- pnpm --filter database generate

if ! pnpm exec dotenv -e .env -- pnpm --filter database exec prisma migrate status 2>/dev/null | grep -q "Database schema is up to date"; then
  log "Running database migrations..."
  pnpm exec dotenv -e .env -- pnpm --filter database migrate deploy
else
  success "Database schema is already up to date"
fi

log "Building workspace packages..."
pnpm --filter shared build
pnpm --filter database build

success "Starting API and web servers..."
echo ""
echo -e "${GREEN}API:${NC}    http://localhost:3001"
echo -e "${GREEN}Web:${NC}    http://localhost:5173"
echo -e "${GREEN}Health:${NC} http://localhost:3001/health"
echo ""

pnpm dev
