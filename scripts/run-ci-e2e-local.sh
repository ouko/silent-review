#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

export NODE_ENV=test
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/silent_review
export REDIS_URL=redis://localhost:6379
export JWT_SECRET=test-jwt-secret-that-is-at-least-32-characters-long
export JWT_REFRESH_SECRET=test-refresh-secret-that-is-at-least-32-characters-long

echo "Building packages..."
pnpm --filter shared build
pnpm --filter database build
pnpm --filter api build
pnpm --filter web build

echo "Applying migrations and seed..."
pnpm --filter database run deploy
pnpm db:seed

echo "Starting servers..."
pnpm --filter api start &
API_PID=$!
pnpm --filter web run preview --port 5173 &
WEB_PID=$!

cleanup() {
  echo "Stopping servers..."
  kill $API_PID $WEB_PID 2>/dev/null || true
  wait $API_PID $WEB_PID 2>/dev/null || true
}
trap cleanup EXIT

echo "Waiting for servers..."
for i in {1..60}; do
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health | grep -q "200" && \
     curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/login | grep -q "200"; then
    echo "Servers ready"
    break
  fi
  echo "  attempt $i..."
  sleep 2
done

echo "Running E2E tests..."
pnpm test:e2e
