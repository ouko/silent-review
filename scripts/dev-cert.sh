#!/usr/bin/env bash
# Generate a local CA and a dev TLS certificate for HTTPS development.
#
# Usage:
#   bash scripts/dev-cert.sh [LAN_IP]
#
# Creates (in certs/, gitignored):
#   local-ca.pem / local-ca-key.pem   local certificate authority
#   dev-cert.pem / dev-key.pem        server cert for localhost + LAN IP
#
# The server cert is re-issued automatically when the LAN IP changes.
# To trust the CA on an iPhone: AirDrop certs/local-ca.pem to the phone,
# install the profile (Settings > Profile Downloaded), then enable it in
# Settings > General > About > Certificate Trust Settings.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
CERTS_DIR="${PROJECT_ROOT}/certs"
LAN_IP="${1:-}"

CA_KEY="${CERTS_DIR}/local-ca-key.pem"
CA_CERT="${CERTS_DIR}/local-ca.pem"
SRV_KEY="${CERTS_DIR}/dev-key.pem"
SRV_CERT="${CERTS_DIR}/dev-cert.pem"

mkdir -p "${CERTS_DIR}"

# --- local CA (created once) ---
if [ ! -f "${CA_CERT}" ]; then
  openssl req -x509 -newkey rsa:2048 -nodes -days 3650 \
    -keyout "${CA_KEY}" -out "${CA_CERT}" \
    -subj "/CN=Silent Review Local CA" 2>/dev/null
  echo "[dev-cert] Created local CA: ${CA_CERT}"
fi

# --- SAN list ---
SANS="DNS:localhost,IP:127.0.0.1"
if [ -n "${LAN_IP}" ]; then
  SANS="${SANS},IP:${LAN_IP}"
fi

# Re-issue only when missing or the LAN IP changed.
if [ -f "${SRV_CERT}" ] && [ -f "${CERTS_DIR}/.sans" ] && [ "$(cat "${CERTS_DIR}/.sans")" = "${SANS}" ]; then
  exit 0
fi

TMPDIR_CERT="$(mktemp -d)"
trap 'rm -rf "${TMPDIR_CERT}"' EXIT

cat > "${TMPDIR_CERT}/ext.cnf" <<EOF
subjectAltName=${SANS}
extendedKeyUsage=serverAuth
EOF

openssl req -newkey rsa:2048 -nodes \
  -keyout "${SRV_KEY}" -out "${TMPDIR_CERT}/dev.csr" \
  -subj "/CN=silent-review-dev" 2>/dev/null

openssl x509 -req -days 825 \
  -in "${TMPDIR_CERT}/dev.csr" \
  -CA "${CA_CERT}" -CAkey "${CA_KEY}" -CAcreateserial \
  -out "${SRV_CERT}" \
  -extfile "${TMPDIR_CERT}/ext.cnf" 2>/dev/null

echo "${SANS}" > "${CERTS_DIR}/.sans"
echo "[dev-cert] Issued dev cert for ${SANS}"
