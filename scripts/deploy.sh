#!/usr/bin/env bash
# Production deployment script for Silent Review.
# Usage: pnpm deploy
#
# Assumptions:
# - Run on the production host (VPS) inside the project directory.
# - .env.prod exists and contains production secrets.
# - Docker and Docker Compose v2.17+ are installed.
# - User has passwordless sudo or is root.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${BLUE}[deploy]${NC} $1"; }
success() { echo -e "${GREEN}[deploy]${NC} $1"; }
warn() { echo -e "${YELLOW}[deploy]${NC} $1"; }
error() { echo -e "${RED}[deploy]${NC} $1"; }

cd "${PROJECT_ROOT}"

ENV_FILE="${ENV_FILE:-.env.prod}"
if [ ! -f "${ENV_FILE}" ]; then
  error "Environment file not found: ${ENV_FILE}"
  exit 1
fi

# Load production environment for docker compose.
set -a
source "${ENV_FILE}"
set +a

log "Pulling latest code..."
git pull origin main

log "Installing dependencies..."
pnpm install --frozen-lockfile

log "Building web app..."
pnpm --filter web build

log "Tagging current API image for rollback..."
docker tag silent-review/api:latest silent-review/api:previous 2>/dev/null || true

log "Building and deploying production stack..."
docker compose -f docker-compose.prod.yml --env-file "${ENV_FILE}" up -d --build --wait

log "Running database migrations..."
pnpm --filter database run deploy

HEALTH_URL="${WEB_APP_URL:-http://localhost}/api/health"
log "Waiting for health check at ${HEALTH_URL}..."
for i in {1..30}; do
  if curl -fsS "${HEALTH_URL}" >/dev/null 2>&1; then
    success "Health check passed"
    break
  fi
  if [ "$i" -eq 30 ]; then
    error "Health check failed after 60 seconds"
    warn "Rolling back to previous image..."
    docker compose -f docker-compose.prod.yml --env-file "${ENV_FILE}" pull api 2>/dev/null || true
    docker tag silent-review/api:previous silent-review/api:latest
    docker compose -f docker-compose.prod.yml --env-file "${ENV_FILE}" up -d api
    error "Deployment rolled back"
    exit 1
  fi
  sleep 2
done

success "Deployment complete"
