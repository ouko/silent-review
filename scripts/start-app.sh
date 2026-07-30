#!/usr/bin/env bash
# Start the full Silent Review app for local testing in one command.
#
# This is the optimal entry point: it brings up the Docker infrastructure
# (PostgreSQL + Redis), then starts the API and web dev servers over HTTPS
# via the dev-lan daemon (background, survives terminal close), and verifies
# everything is reachable.
#
# Usage:
#   bash scripts/start-app.sh           # start everything
#   bash scripts/start-app.sh stop      # stop the dev servers (infra stays up)
#   bash scripts/start-app.sh restart   # restart the dev servers
#   bash scripts/start-app.sh status    # show status and URLs
#
# First run on an iPhone: install certs/local-ca.pem (see printed notes).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PROJECT_ROOT}"

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${BLUE}[start-app]${NC} $1"; }
success() { echo -e "${GREEN}[start-app]${NC} $1"; }
warn() { echo -e "${YELLOW}[start-app]${NC} $1"; }
error() { echo -e "${RED}[start-app]${NC} $1"; }

lan_ip() {
  local iface ip=""
  iface="$(route -n get default 2>/dev/null | awk '/interface:/{print $2}' | head -n1 || true)"
  [ -n "${iface}" ] && ip="$(ipconfig getifaddr "${iface}" 2>/dev/null || true)"
  if [ -z "${ip}" ]; then
    for iface in en0 en1; do
      ip="$(ipconfig getifaddr "${iface}" 2>/dev/null || true)"
      [ -n "${ip}" ] && break
    done
  fi
  echo "${ip}"
}

ensure_infra() {
  if docker ps --format '{{.Names}}' | grep -q "^silent-review-postgres$"; then
    log "PostgreSQL and Redis already running"
  else
    log "Starting PostgreSQL and Redis..."
    docker compose up -d
  fi

  log "Waiting for PostgreSQL to be healthy..."
  for i in {1..30}; do
    if docker exec silent-review-postgres pg_isready -U postgres -d silent_review >/dev/null 2>&1; then
      success "Infrastructure is ready"
      return 0
    fi
    [ "$i" -eq 30 ] && { error "PostgreSQL did not become healthy in time"; exit 1; }
    sleep 1
  done
}

print_urls() {
  local ip
  ip="$(lan_ip)"
  echo ""
  success "Silent Review is running:"
  echo -e "  ${GREEN}Laptop:${NC}  https://localhost:5173"
  [ -n "${ip}" ] && echo -e "  ${GREEN}Phone:${NC}    https://${ip}:5173"
  echo -e "  ${GREEN}API:${NC}     http://localhost:3001/health"
  echo ""
  echo "Phone first-time setup: AirDrop certs/local-ca.pem to the iPhone,"
  echo "install the profile, then enable it in Settings > General > About >"
  echo "Certificate Trust Settings."
  echo ""
  echo "Logs: logs/dev-lan.log   Stop: bash scripts/start-app.sh stop"
}

verify() {
  local ip code=""
  ip="$(lan_ip)"
  for i in {1..40}; do
    code="$(curl -sk -o /dev/null -w '%{http_code}' "https://${ip:-localhost}:5173/login" --max-time 3 2>/dev/null || true)"
    [ "${code}" = "200" ] && { success "App is reachable (HTTPS 200)"; return 0; }
    sleep 3
  done
  error "App did not become reachable in time. Check logs/dev-lan.log"
  exit 1
}

CMD="${1:-start}"
case "${CMD}" in
  start)
    ensure_infra
    bash scripts/dev-lan-daemon.sh start
    verify
    print_urls
    ;;
  stop)
    bash scripts/dev-lan-daemon.sh stop
    success "Dev servers stopped (PostgreSQL/Redis left running; stop with: docker compose down)"
    ;;
  restart)
    ensure_infra
    bash scripts/dev-lan-daemon.sh restart
    verify
    print_urls
    ;;
  status)
    bash scripts/dev-lan-daemon.sh status || true
    print_urls
    ;;
  *)
    error "Unknown command: ${CMD} (use start|stop|restart|status)"
    exit 1
    ;;
esac
