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

# --- detect LAN IP ---
LAN_IP=""
for iface in en0 en1 en2 en3 eth0 wlan0; do
  LAN_IP="$(ipconfig getifaddr "${iface}" 2>/dev/null || true)"
  [ -n "${LAN_IP}" ] && break
done

if [ -z "${LAN_IP}" ]; then
  error "Could not detect a LAN IP address. Make sure you are connected to a network."
  exit 1
fi

success "Detected LAN IP: ${LAN_IP}"

# --- environment overrides ---
# WEB_APP_URL controls the API CORS origin and Socket.IO origin.
# VITE_API_URL is the API base URL used by the browser and the Vite proxy.
export WEB_APP_URL="http://${LAN_IP}:5173"
export VITE_API_URL="http://${LAN_IP}:3001"

# --- start ---
log "Starting API and web dev servers..."
echo ""
echo -e "${GREEN}Local:${NC}  http://localhost:5173"
echo -e "${GREEN}LAN:${NC}   http://${LAN_IP}:5173"
echo -e "${GREEN}API:${NC}   http://${LAN_IP}:3001"
echo ""
echo "Open the LAN URL on your iPhone. Both devices must be on the same Wi-Fi."
echo "Press Ctrl+C to stop the dev servers."
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

wait
