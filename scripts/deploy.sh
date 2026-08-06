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
# Pull the branch this checkout is on, not a hardcoded one — deploy boxes
# may track a release branch.
CURRENT_BRANCH="$(git branch --show-current)"
git pull origin "${CURRENT_BRANCH}"

log "Installing dependencies..."
# .env.prod exports NODE_ENV=production, which makes pnpm skip devDependencies
# — but tsc/vite are devDependencies and the build needs them. Install with
# devDependencies included regardless.
NODE_ENV=development pnpm install --frozen-lockfile

log "Building web app..."
# The SPA and API share an origin behind nginx, so the browser must use
# relative URLs. Never bake the dev localhost URL into the prod bundle.
export VITE_API_URL=""
pnpm --filter web build

log "Tagging current API image for rollback..."
docker tag silent-review/api:latest silent-review/api:previous 2>/dev/null || true

log "Building and deploying production stack..."
docker compose -f docker-compose.prod.yml --env-file "${ENV_FILE}" up -d --build --wait

log "Running database migrations..."
# Apply migrations via psql in the postgres container: deterministic, no
# extra image pulls, and immune to the Prisma engine's OpenSSL issues on
# Alpine and memory pressure on small hosts.
bash scripts/migrate-psql.sh

if [ "${RUN_SEED:-}" = "true" ]; then
  log "Seeding demo data (RUN_SEED=true)..."
  docker compose -f docker-compose.prod.yml --env-file "${ENV_FILE}" exec -T api node_modules/.bin/tsx packages/database/prisma/seed.ts
fi

# Keep a copy of the operations runbook in the deploy user's home so it is
# visible the moment anyone SSHs in.
cp docs/RUNBOOK.md "${HOME}/RUNBOOK.md" 2>/dev/null || true

# Regenerate HTTPS config from template on every deploy so security-header
# and static-location changes are picked up. Certbot is a no-op when the
# certificate is still valid.
if [ "${WEB_APP_URL:-}" != "${WEB_APP_URL#https://}" ]; then
  log "Ensuring HTTPS config is current..."
  bash scripts/init-ssl.sh
fi

# Seeding truncates tables, so any cached feeds/profiles/notifications are
# stale. Clear the affected Redis keys before users hit the app.
if [ "${RUN_SEED:-}" = "true" ]; then
  log "Clearing stale Redis caches after seed..."
  docker compose -f docker-compose.prod.yml --env-file "${ENV_FILE}" exec -T redis sh -c '
    for pattern in feed:* user:profile:* notifications:* dailydrop:*; do
      for key in $(redis-cli --scan --pattern "$pattern"); do
        redis-cli DEL "$key" >/dev/null
      done
    done
  '

  log "Warming anonymous feed cache..."
  curl -fsS "${WEB_APP_URL}/api/feed?limit=20" >/dev/null 2>&1 || true
fi

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
