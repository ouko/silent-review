#!/usr/bin/env bash
# Obtain or renew a Let's Encrypt certificate and activate the HTTPS nginx config.
# Usage: bash scripts/init-ssl.sh
# Required env (loaded from ENV_FILE): WEB_APP_URL
# Optional env: CERTBOT_EMAIL (defaults to admin@<domain>)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

ENV_FILE="${ENV_FILE:-.env.prod}"
if [ ! -f "${PROJECT_ROOT}/${ENV_FILE}" ]; then
  echo "Environment file not found: ${PROJECT_ROOT}/${ENV_FILE}"
  exit 1
fi

set -a
source "${PROJECT_ROOT}/${ENV_FILE}"
set +a

WEB_APP_URL="${WEB_APP_URL:-}"
if [ -z "${WEB_APP_URL}" ]; then
  echo "WEB_APP_URL is not set in ${ENV_FILE}"
  exit 1
fi

DOMAIN="${WEB_APP_URL#https://}"
DOMAIN="${DOMAIN#http://}"
DOMAIN="${DOMAIN%%/*}"

if [ -z "${DOMAIN}" ]; then
  echo "Could not extract domain from WEB_APP_URL=${WEB_APP_URL}"
  exit 1
fi

EMAIL="${CERTBOT_EMAIL:-admin@${DOMAIN}}"
SSL_CONF="${PROJECT_ROOT}/nginx/conf.d/ssl.conf"
SSL_TEMPLATE="${PROJECT_ROOT}/nginx/conf.d/ssl.conf.template"

echo "[ssl] Domain: ${DOMAIN}"
echo "[ssl] Certbot email: ${EMAIL}"

# Ensure the HTTP stack is serving the ACME challenge path before certbot runs.
if ! docker ps --format '{{.Names}}' | grep -q '^silent-review-nginx$'; then
  echo "[ssl] Nginx container is not running. Start the stack first: ENV_FILE=${ENV_FILE} ./scripts/deploy.sh"
  exit 1
fi

# Obtain/renew certificate via webroot (nginx serves /.well-known/acme-challenge/).
docker run --rm \
  -v "${PROJECT_ROOT}/data/certbot/conf:/etc/letsencrypt" \
  -v "${PROJECT_ROOT}/data/certbot/www:/var/www/certbot" \
  certbot/certbot certonly \
    --webroot --webroot-path=/var/www/certbot \
    --agree-tos --no-eff-email \
    --email "${EMAIL}" \
    -d "${DOMAIN}" \
    --keep-until-expiring \
    --non-interactive

# Generate nginx HTTPS config from the template.
sed "s/example.com/${DOMAIN}/g" "${SSL_TEMPLATE}" > "${SSL_CONF}"

echo "[ssl] Reloading nginx..."
docker compose -f "${PROJECT_ROOT}/docker-compose.prod.yml" --env-file "${PROJECT_ROOT}/${ENV_FILE}" exec nginx nginx -s reload

echo "[ssl] HTTPS active for ${DOMAIN}"
