#!/usr/bin/env bash
# Diagnose why an iPhone (or other device) cannot reach the Silent Review
# dev stack on this Mac over the local network.
#
# Usage:
#   bash scripts/diagnose-lan.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PROJECT_ROOT}"

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${BLUE}[diagnose-lan]${NC} $1"; }
success() { echo -e "${GREEN}[diagnose-lan]${NC} $1"; }
warn() { echo -e "${YELLOW}[diagnose-lan]${NC} $1"; }
error() { echo -e "${RED}[diagnose-lan]${NC} $1"; }

echo ""
echo "=============================================="
echo "  Silent Review LAN connectivity diagnostic"
echo "=============================================="
echo ""

# --- network info ---
log "Network interfaces on this Mac:"
for iface in en0 en1 en2 en3 en4 en5 eth0 wlan0; do
  IP="$(ipconfig getifaddr "${iface}" 2>/dev/null || true)"
  if [ -n "${IP}" ]; then
    echo "  ${iface}: ${IP}"
  fi
done

echo ""
DEFAULT_IFACE="$(route -n get default 2>/dev/null | awk '/interface:/{print $2}' | head -n1 || true)"
DEFAULT_IP=""
if [ -n "${DEFAULT_IFACE}" ]; then
  DEFAULT_IP="$(ipconfig getifaddr "${DEFAULT_IFACE}" 2>/dev/null || true)"
  log "Default route interface: ${DEFAULT_IFACE} (${DEFAULT_IP:-no IP})"
else
  warn "Could not determine default route interface"
fi

echo ""
log "Hostname for convenience: $(hostname -s 2>/dev/null || hostname)"

# --- port listeners ---
echo ""
log "Checking if ports 3001 and 5173 are listening:"
for port in 3001 5173; do
  if lsof -nP -iTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1; then
    success "Port ${port}: listening"
    lsof -nP -iTCP:"${port}" -sTCP:LISTEN | tail -n +2 | awk '{print "         PID "$2" "$1}'
  else
    error "Port ${port}: NOT listening (server is not running?)"
  fi
done

# --- reachability tests ---
echo ""
log "Reachability tests from this Mac:"
for url in "http://127.0.0.1:3001/health" "http://127.0.0.1:5173/login" \
           "http://localhost:3001/health" "http://localhost:5173/login"; do
  code="$(curl -s -o /dev/null -w "%{http_code}" "${url}" 2>/dev/null || true)"
  if [ "${code}" = "200" ]; then
    success "${url} -> ${code}"
  else
    error "${url} -> ${code}"
  fi
done

if [ -n "${DEFAULT_IP}" ]; then
  echo ""
  log "LAN IP reachability tests from this Mac:"
  for url in "http://${DEFAULT_IP}:3001/health" "http://${DEFAULT_IP}:5173/login"; do
    code="$(curl -s -o /dev/null -w "%{http_code}" "${url}" 2>/dev/null || true)"
    if [ "${code}" = "200" ]; then
      success "${url} -> ${code}"
    else
      error "${url} -> ${code}"
    fi
  done
fi

# --- VPN ---
echo ""
VPN_IFACES="$(ifconfig 2>/dev/null | grep -E "^utun|^tun|^ppp|^ipsec" | awk -F: '{print $1}' | tr '\n' ' ' || true)"
if [ -n "${VPN_IFACES}" ]; then
  warn "Active VPN/tunnel interfaces detected: ${VPN_IFACES}"
  warn "VPNs often block inbound LAN connections. Try disconnecting the VPN."
else
  success "No VPN/tunnel interfaces detected"
fi

# --- firewall ---
echo ""
log "macOS Firewall:"
FW_BIN="/usr/libexec/ApplicationFirewall/socketfilterfw"
if [ -x "${FW_BIN}" ]; then
  fw_state="$(${FW_BIN} --getglobalstate 2>/dev/null | head -n1 || true)"
  if [ -n "${fw_state}" ]; then
    if echo "${fw_state}" | grep -qi "enabled"; then
      warn "${fw_state}"
      warn "If inbound connections are blocked, allow node/tsx/vite or turn it off temporarily."
    else
      success "${fw_state}"
    fi
  else
    warn "Could not read firewall state (may need admin rights)"
  fi
else
  warn "Could not locate ${FW_BIN}"
fi

# --- recommendation ---
echo ""
echo "=============================================="
if [ -n "${DEFAULT_IP}" ]; then
  success "Try opening this URL on your iPhone:"
  echo ""
  echo "  http://${DEFAULT_IP}:5173"
  echo ""
  log "If that does not load on the iPhone:"
  echo "  1. Confirm the iPhone is on the same Wi-Fi as this Mac."
  echo "  2. Disconnect any VPN on this Mac."
  echo "  3. Turn off macOS Firewall temporarily."
  echo "  4. On the iPhone, open this page in Safari (not Chrome/other apps)."
  echo "  5. Make sure iCloud Private Relay is off on the iPhone."
  echo ""
  log "If the Mac itself cannot reach http://${DEFAULT_IP}:3001/health, the"
  log "issue is on this Mac (firewall/VPN), not the iPhone."
else
  error "Could not determine a LAN IP. Connect this Mac to Wi-Fi first."
fi
echo "=============================================="
echo ""
