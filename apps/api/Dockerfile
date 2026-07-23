# syntax=docker/dockerfile:1

# Multi-stage build for the Silent Review API.
# Builds the shared types, database client, and API in one image,
# then copies the production artifact into a smaller runtime image.

FROM node:20-alpine AS builder
WORKDIR /app

# Enable pnpm via corepack (matches packageManager field).
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

# Install dependencies first (better layer caching).
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile

# Copy source and build the workspace packages the API depends on.
COPY . .
RUN pnpm --filter shared build \
    && pnpm --filter database build \
    && pnpm --filter api build

# Runtime image: lean Alpine image with only the built artifacts.
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy the full built workspace so workspace symlinks resolve correctly.
COPY --from=builder /app .

# Health check used by docker-compose and deployment scripts.
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3001/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

EXPOSE 3001
CMD ["node", "apps/api/dist/server.js"]
