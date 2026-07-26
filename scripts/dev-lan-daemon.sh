#!/usr/bin/env bash
# Run the LAN dev stack as a background daemon so it survives terminal closes.
#
# Usage:
#   bash scripts/dev-lan-daemon.sh start   # start in background
#   bash scripts/dev-lan-daemon.sh status  # show pid and URLs
#   bash scripts/dev-lan-daemon.sh logs    # tail the log
#   bash scripts/dev-lan-daemon.sh stop    # stop the daemon
#   bash scripts/dev-lan-daemon.sh restart # stop + start

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PID_FILE="${PROJECT_ROOT}/.dev-lan-daemon.pid"
LOG_FILE="${PROJECT_ROOT}/logs/dev-lan.log"

cd "${PROJECT_ROOT}"

mkdir -p "$(dirname "${LOG_FILE}")"

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${BLUE}[dev-lan-daemon]${NC} $1"; }
success() { echo -e "${GREEN}[dev-lan-daemon]${NC} $1"; }
warn() { echo -e "${YELLOW}[dev-lan-daemon]${NC} $1"; }
error() { echo -e "${RED}[dev-lan-daemon]${NC} $1"; }

get_pid() {
  if [ -f "${PID_FILE}" ]; then
    cat "${PID_FILE}" 2>/dev/null || true
  else
    echo ""
  fi
}

is_running() {
  local pid
  pid="$(get_pid)"
  [ -n "${pid}" ] && kill -0 "${pid}" 2>/dev/null
}

# Recursively kill a process and all of its descendants.
kill_tree() {
  local parent=$1
  local children
  children="$(pgrep -P "${parent}" 2>/dev/null || true)"
  for child in ${children}; do
    kill_tree "${child}"
  done
  kill -9 "${parent}" 2>/dev/null || true
}

# Stop any stray dev-lan processes that belong to this project.
cleanup_stray() {
  pkill -9 -f "tsx watch src/server.ts" 2>/dev/null || true
  pkill -9 -f "/vite/bin/vite.js" 2>/dev/null || true
  pkill -9 -f "concurrently/dist/bin/concurrently.js pnpm dev:api pnpm dev:web" 2>/dev/null || true
  pkill -9 -f "dev-lan.sh" 2>/dev/null || true
  sleep 1
}

start_daemon() {
  if is_running; then
    warn "Dev LAN daemon is already running (PID $(get_pid))."
    status_daemon
    return 0
  fi

  cleanup_stray
  rm -f "${PID_FILE}" "${LOG_FILE}"

  log "Starting LAN dev stack in the background..."
  log "Log file: ${LOG_FILE}"

  nohup bash "${PROJECT_ROOT}/scripts/dev-lan.sh" > "${LOG_FILE}" 2>&1 &
  local pid=$!
  echo "${pid}" > "${PID_FILE}"

  success "Daemon started with PID ${pid}."
  log "Waiting for servers to become reachable..."

  local ready=false
  for i in $(seq 1 120); do
    if grep -q "Servers are reachable from the local network" "${LOG_FILE}" 2>/dev/null; then
      ready=true
      break
    fi
    if ! kill -0 "${pid}" 2>/dev/null; then
      error "Daemon exited before becoming reachable."
      error "Check the log: ${LOG_FILE}"
      rm -f "${PID_FILE}"
      return 1
    fi
    sleep 1
  done

  if [ "${ready}" = true ]; then
    success "Servers are reachable."
    status_daemon
  else
    warn "Servers did not report ready within 2 minutes."
    warn "They may still be starting. Check logs with: bash scripts/dev-lan-daemon.sh logs"
  fi
}

stop_daemon() {
  local pid
  pid="$(get_pid)"
  if [ -z "${pid}" ] && ! is_running; then
    warn "No PID file found."
    cleanup_stray
    return 0
  fi

  if is_running; then
    log "Stopping daemon (PID ${pid})..."
    # First try a graceful INT so dev-lan.sh can run its cleanup trap.
    kill -INT "${pid}" 2>/dev/null || true
    for i in $(seq 1 10); do
      if ! kill -0 "${pid}" 2>/dev/null; then
        break
      fi
      sleep 1
    done
    # If anything is still alive, recursively kill the whole tree.
    if kill -0 "${pid}" 2>/dev/null; then
      warn "Daemon did not stop gracefully, cleaning up process tree..."
      kill_tree "${pid}"
    fi
    success "Daemon stopped."
  else
    warn "Daemon is not running (stale PID file)."
  fi

  rm -f "${PID_FILE}"
  cleanup_stray
}

status_daemon() {
  local pid
  pid="$(get_pid)"
  echo ""
  echo "PID file: ${PID_FILE}"
  echo "Log file: ${LOG_FILE}"
  echo ""
  if is_running; then
    success "Daemon is running (PID ${pid})."
  else
    error "Daemon is not running."
  fi

  local lan_ip=""
  if [ -f "${LOG_FILE}" ]; then
    lan_ip="$(grep -oE 'LAN:   http://[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+:5173' "${LOG_FILE}" | tail -1 | awk '{print $2}' || true)"
  fi
  if [ -n "${lan_ip}" ]; then
    echo ""
    echo "Open this URL on your iPhone:"
    echo "  ${lan_ip}"
  fi
  echo ""
}

logs_daemon() {
  if [ -f "${LOG_FILE}" ]; then
    tail -n 100 -f "${LOG_FILE}"
  else
    warn "No log file found at ${LOG_FILE}."
  fi
}

usage() {
  echo "Usage: $0 {start|stop|status|restart|logs}"
  exit 1
}

case "${1:-start}" in
  start)
    start_daemon
    ;;
  stop)
    stop_daemon
    ;;
  status)
    status_daemon
    ;;
  restart)
    stop_daemon
    start_daemon
    ;;
  logs)
    logs_daemon
    ;;
  *)
    usage
    ;;
esac
