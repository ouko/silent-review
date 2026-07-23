#!/usr/bin/env bash
# Daily PostgreSQL backup to S3 for Silent Review.
# Usage: scripts/backup.sh
# Recommended cron: 0 3 * * * /path/to/silent-review/scripts/backup.sh >> /var/log/silent-review-backup.log 2>&1

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${BLUE}[backup]${NC} $1"; }
success() { echo -e "${GREEN}[backup]${NC} $1"; }
warn() { echo -e "${YELLOW}[backup]${NC} $1"; }
error() { echo -e "${RED}[backup]${NC} $1"; }

cd "${PROJECT_ROOT}"

ENV_FILE="${ENV_FILE:-.env.prod}"
if [ -f "${ENV_FILE}" ]; then
  set -a
  source "${ENV_FILE}"
  set +a
fi

DATABASE_URL="${DATABASE_URL:-}"
S3_BUCKET_NAME="${S3_BUCKET_NAME:-silent-review-backups}"
AWS_REGION="${AWS_REGION:-us-east-1}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

if [ -z "${DATABASE_URL}" ]; then
  error "DATABASE_URL is not set"
  exit 1
fi

DATE=$(date +%Y%m%d-%H%M%S)
DUMP_FILE="silent-review-${DATE}.sql.gz"
LOCAL_DUMP="/tmp/${DUMP_FILE}"

cleanup() {
  rm -f "${LOCAL_DUMP}"
}
trap cleanup EXIT

log "Creating PostgreSQL dump..."
pg_dump "${DATABASE_URL}" --no-owner --no-acl | gzip > "${LOCAL_DUMP}"

log "Uploading to s3://${S3_BUCKET_NAME}/backups/${DUMP_FILE}..."
aws s3 cp "${LOCAL_DUMP}" "s3://${S3_BUCKET_NAME}/backups/${DUMP_FILE}" --region "${AWS_REGION}"

log "Cleaning up backups older than ${RETENTION_DAYS} days..."
aws s3 ls "s3://${S3_BUCKET_NAME}/backups/" --region "${AWS_REGION}" | \
  awk '{print $4}' | \
  while read -r file; do
    file_date=$(echo "${file}" | grep -oE '[0-9]{8}-[0-9]{6}' | head -1 || true)
    if [ -n "${file_date}" ]; then
      file_epoch=$(date -j -f "%Y%m%d-%H%M%S" "${file_date}" +%s 2>/dev/null || date -d "${file_date:0:8} ${file_date:9:2}:${file_date:11:2}:${file_date:13:2}" +%s 2>/dev/null || echo 0)
      cutoff_epoch=$(date -v-${RETENTION_DAYS}d +%s 2>/dev/null || date -d "-${RETENTION_DAYS} days" +%s)
      if [ "${file_epoch}" != "0" ] && [ "${file_epoch}" -lt "${cutoff_epoch}" ]; then
        log "Deleting old backup: ${file}"
        aws s3 rm "s3://${S3_BUCKET_NAME}/backups/${file}" --region "${AWS_REGION}"
      fi
    fi
  done

success "Backup complete: ${DUMP_FILE}"
