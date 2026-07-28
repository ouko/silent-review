#!/usr/bin/env bash
# Start the Silent Review dev stack so it is reachable from other devices on
# the same local network (e.g. an iPhone on the same Wi-Fi).
#
# This script detects the machine's LAN IP, updates the API CORS origin and the
# browser API base URL to use that IP, and starts the API + web dev servers.
#
# Usage:
#   bash scripts/dev-lan.sh
#
# Then open the printed LAN URL on your phone.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PROJECT_ROOT}"

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${BLUE}[dev-lan]${NC} $1"; }
success() { echo -e "${GREEN}[dev-lan]${NC} $1"; }
warn() { echo -e "${YELLOW}[dev-lan]${NC} $1"; }
error() { echo -e "${RED}[dev-lan]${NC} $1"; }

# Ignore SIGHUP so this script (and its children) survive when the parent
# terminal closes, e.g. when run via scripts/dev-lan-daemon.sh.
trap '' HUP

# --- one-time setup ---
# dev-lan.sh is often run directly on a fresh clone, so make sure the
# environment, dependencies, database, and built workspace packages exist.
if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    log "Creating .env from .env.example with generated secrets"
    cp .env.example .env
    node -e "
const fs = require('fs');
const crypto = require('crypto');
const envPath = '.env';
let env = fs.readFileSync(envPath, 'utf8');
const secret = crypto.randomBytes(32).toString('hex');
const refreshSecret = crypto.randomBytes(32).toString('hex');
env = env.replace(/^JWT_SECRET=.*$/m, 'JWT_SECRET=' + secret);
env = env.replace(/^JWT_REFRESH_SECRET=.*$/m, 'JWT_REFRESH_SECRET=' + refreshSecret);
fs.writeFileSync(envPath, env);
"
  else
    error ".env.example not found. Cannot create .env"
    exit 1
  fi
else
  log ".env already exists"
fi

if ! grep -qE '^JWT_SECRET=.{32,}' .env 2>/dev/null; then
  warn "JWT_SECRET is missing or too short in .env."
  warn "Generate secrets with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
  warn "Then paste them into .env as JWT_SECRET and JWT_REFRESH_SECRET."
fi

if [ ! -d "node_modules" ]; then
  log "Installing dependencies..."
  pnpm install
else
  log "Dependencies already installed"
fi

if ! docker ps --format '{{.Names}}' | grep -q "^silent-review-postgres$"; then
  log "Starting PostgreSQL and Redis..."
  docker compose up -d
else
  log "PostgreSQL and Redis already running"
fi

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
  pnpm exec dotenv -e .env -- pnpm --filter database run deploy
else
  success "Database schema is already up to date"
fi

log "Building workspace packages..."
pnpm --filter shared build
pnpm --filter database build

# The API serves uploaded videos from ./uploads, but the seeded demo assets live
# in apps/web/public/uploads. Copy them once so the API can serve them through
# the /uploads proxy to every device on the LAN.
log "Syncing demo video assets to API upload directory..."
mkdir -p uploads
cp -n apps/web/public/uploads/* uploads/ 2>/dev/null || true

# --- detect LAN IP ---
# Prefer the interface used for the default route (the one that reaches the
# internet), since that is almost always the same network the iPhone is on.
DEFAULT_IFACE="$(route -n get default 2>/dev/null | awk '/interface:/{print $2}' | head -n1 || true)"

LAN_IP=""
if [ -n "${DEFAULT_IFACE}" ]; then
  LAN_IP="$(ipconfig getifaddr "${DEFAULT_IFACE}" 2>/dev/null || true)"
fi

# Fall back to scanning common interfaces if the default route didn't give us one.
if [ -z "${LAN_IP}" ]; then
  for iface in en0 en1 en2 en3 eth0 wlan0; do
    LAN_IP="$(ipconfig getifaddr "${iface}" 2>/dev/null || true)"
    [ -n "${LAN_IP}" ] && break
  done
fi

if [ -z "${LAN_IP}" ]; then
  error "Could not detect a LAN IP address. Make sure you are connected to a network."
  exit 1
fi

success "Detected LAN IP: ${LAN_IP}"
if [ -n "${DEFAULT_IFACE}" ]; then
  log "(using default-route interface: ${DEFAULT_IFACE})"
fi

# --- environment overrides ---
# WEB_APP_URL controls the API CORS origin and Socket.IO origin.
# VITE_API_URL is the API base URL used by the browser and the Vite proxy.
export WEB_APP_URL="http://${LAN_IP}:5173"
export VITE_API_URL="http://${LAN_IP}:3001"

# --- start ---
log "Starting API and web dev servers..."
echo ""

pnpm exec concurrently \
  "pnpm dev:api" \
  "pnpm dev:web" \
  --names api,web --prefix-colors blue,green &
CONCURRENTLY_PID=$!

cleanup() {
  echo ""
  log "Shutting down dev servers..."
  kill "${CONCURRENTLY_PID}" 2>/dev/null || true
  wait "${CONCURRENTLY_PID}" 2>/dev/null || true
}
trap cleanup INT TERM EXIT

# --- wait for readiness ---
API_URL="http://${LAN_IP}:3001/health"
WEB_URL="http://${LAN_IP}:5173/login"

log "Waiting for servers to accept connections (this can take 20–40s)..."
READY=false
for i in $(seq 1 120); do
  API_OK=false
  WEB_OK=false
  if curl -s -o /dev/null -w "%{http_code}" "${API_URL}" 2>/dev/null | grep -q "200"; then
    API_OK=true
  fi
  if curl -s -o /dev/null -w "%{http_code}" "${WEB_URL}" 2>/dev/null | grep -q "200"; then
    WEB_OK=true
  fi
  if [ "${API_OK}" = true ] && [ "${WEB_OK}" = true ]; then
    READY=true
    break
  fi
  # Print a progress dot every 10 seconds so the terminal does not look frozen.
  if [ $((i % 10)) -eq 0 ]; then
    echo -n "."
  fi
  sleep 1
done

if [ "${READY}" = false ]; then
  echo ""
  error "Servers did not become reachable on the LAN IP within 2 minutes."
  error "Common causes: macOS Firewall, a VPN, missing JWT secrets, or the phone not being on the same network."
  error "Run 'bash scripts/diagnose-lan.sh' for details."
  exit 1
fi

success "Servers are reachable from the local network."
echo ""
echo -e "${GREEN}Local:${NC}  http://localhost:5173"
echo -e "${GREEN}LAN:${NC}   http://${LAN_IP}:5173"
echo -e "${GREEN}API:${NC}   http://${LAN_IP}:3001"
echo ""
echo "Open the LAN URL on your iPhone. Both devices must be on the same Wi-Fi."
echo "If the page does not load, check System Settings > Privacy & Security >"
echo "Firewall and temporarily disable any VPN on this Mac."
echo ""
echo "Press Ctrl+C to stop the dev servers."
echo ""

wait
