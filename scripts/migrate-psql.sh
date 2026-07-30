#!/usr/bin/env bash
# Apply Prisma migrations directly through psql in the postgres container.
#
# Fallback for environments where the Prisma migrate engine cannot run
# (e.g. Alpine images without libssl.so.1.1, or memory-constrained hosts).
# Records each migration in _prisma_migrations so future `prisma migrate
# deploy` runs see them as applied.
#
# Usage: bash scripts/migrate-psql.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"

CONTAINER="${PG_CONTAINER:-silent-review-postgres}"
DB="${POSTGRES_DB:-silent_review}"
PGUSER="${POSTGRES_USER:-postgres}"

echo "[migrate-psql] ensuring _prisma_migrations table exists"
docker exec -i "${CONTAINER}" psql -U "${PGUSER}" -d "${DB}" -v ON_ERROR_STOP=1 -c \
  'CREATE TABLE IF NOT EXISTS "_prisma_migrations" ("id" VARCHAR(36) PRIMARY KEY NOT NULL, "checksum" VARCHAR(64) NOT NULL, "finished_at" TIMESTAMPTZ, "migration_name" VARCHAR(255) NOT NULL, "logs" TEXT, "rolled_back_at" TIMESTAMPTZ, "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "applied_steps_count" INTEGER NOT NULL DEFAULT 0);'

for dir in packages/database/prisma/migrations/2026*/; do
  name="$(basename "${dir}")"
  applied="$(docker exec -i "${CONTAINER}" psql -U "${PGUSER}" -d "${DB}" -tAc \
    "SELECT 1 FROM \"_prisma_migrations\" WHERE migration_name = '${name}' AND finished_at IS NOT NULL;" || true)"
  if [ "${applied}" = "1" ]; then
    echo "[migrate-psql] ${name} already applied, skipping"
    continue
  fi
  echo "[migrate-psql] applying ${name}"
  docker exec -i "${CONTAINER}" psql -U "${PGUSER}" -d "${DB}" -v ON_ERROR_STOP=1 -f - < "${dir}/migration.sql"
  sum="$(sha256sum "${dir}/migration.sql" | cut -d' ' -f1)"
  docker exec -i "${CONTAINER}" psql -U "${PGUSER}" -d "${DB}" -c \
    "INSERT INTO \"_prisma_migrations\" (id, checksum, finished_at, migration_name, started_at, applied_steps_count) VALUES (gen_random_uuid()::text, '${sum}', now(), '${name}', now(), 1);"
done

echo "[migrate-psql] done"
