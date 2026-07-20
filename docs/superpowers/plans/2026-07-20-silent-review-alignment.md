# Silent Review Monorepo Alignment Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the existing `/Users/lukeouko/silent-review` project so it matches the user's foundation constraints: pnpm workspaces (no Turborepo), `packages/database` containing Prisma, standard local Docker ports, and a sub-5-minute onboarding flow.

**Architecture:** Keep existing feature code intact where possible. Restructure package boundaries so `packages/shared` contains only Zod schemas and types, and `packages/database` contains Prisma schema, generated client, and connection utilities. Update root tooling to use pnpm scripts and `concurrently` instead of Turborepo.

**Tech Stack:** pnpm workspaces, Vite, React, TypeScript, Tailwind CSS, Express, Prisma, PostgreSQL, Redis.

## Global Constraints

- No Turborepo. Root scripts must use pnpm directly.
- `packages/database` must exist and own all Prisma assets and the generated client.
- `packages/shared` must contain only Zod schemas and TypeScript types.
- Docker Compose must expose PostgreSQL on `5432` and Redis on `6379`.
- `.env.example` must document all variables required to run the foundation locally, with defaults matching Docker Compose.
- A new developer must be able to clone and run the app in under 5 minutes.
- Do not delete existing feature code (auth, upload, feed, Socket.io) unless it is directly in the way of the refactor.

---

## File Structure (target)

```
silent-review/
├── apps/
│   ├── api/                 # Express API (existing features preserved)
│   └── web/                 # Vite React app (existing features preserved)
├── packages/
│   ├── database/            # NEW: Prisma schema, client, connection utilities
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── seed.ts      # moved from packages/shared/prisma/seed.ts
│   │   └── src/
│   │       ├── client.ts
│   │       └── index.ts
│   └── shared/              # Zod schemas + types only
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           └── schemas/
│               ├── index.ts
│               ├── review.ts
│               └── user.ts
├── docker-compose.yml
├── .env.example
├── .gitignore
├── package.json
├── pnpm-workspace.yaml
├── README.md
└── tsconfig.json
```

---

## Task 1: Remove Turborepo and Restructure Root Scripts

**Files:**
- Delete: `/Users/lukeouko/silent-review/turbo.json`
- Modify: `/Users/lukeouko/silent-review/package.json`
- Modify: `/Users/lukeouko/silent-review/.gitignore` (remove Turbo entries if present)

**Interfaces:**
- Produces: Root `package.json` with pnpm scripts matching the approved design.

- [ ] **Step 1: Delete `turbo.json`**

```bash
rm /Users/lukeouko/silent-review/turbo.json
```

- [ ] **Step 2: Rewrite root `package.json`**

```json
{
  "name": "silent-review",
  "version": "0.1.0",
  "private": true,
  "description": "Silent Review — monorepo foundation",
  "packageManager": "pnpm@9.12.0",
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  },
  "scripts": {
    "dev": "concurrently \"pnpm dev:api\" \"pnpm dev:web\" --names api,web --prefix-colors blue,green",
    "dev:api": "pnpm --filter api dev",
    "dev:web": "pnpm --filter web dev",
    "dev:infra": "docker compose up -d",
    "build": "pnpm --filter shared build && pnpm --filter database build && pnpm --filter api build && pnpm --filter web build",
    "typecheck": "pnpm -r typecheck",
    "lint": "pnpm -r lint",
    "db:generate": "pnpm --filter database generate",
    "db:migrate": "pnpm --filter database migrate",
    "db:deploy": "pnpm --filter database deploy",
    "db:seed": "pnpm --filter database seed",
    "db:studio": "pnpm --filter database studio",
    "clean": "pnpm -r clean && rm -rf node_modules"
  },
  "devDependencies": {
    "concurrently": "^8.2.2",
    "typescript": "^5.5.0"
  }
}
```

- [ ] **Step 3: Update `.gitignore` to remove Turbo artifacts**

Ensure `.turbo` is not present. The existing `.gitignore` already covers `node_modules`, `dist`, `.env`, logs, OS files. Add `.turbo` if present:

```gitignore
# Turbo (no longer used)
.turbo
```

- [ ] **Step 4: Verify root scripts**

Run:
```bash
cd /Users/lukeouko/silent-review
pnpm install
```

Expected: `concurrently` is installed, no Turbo dependency, `pnpm dev:infra` script exists.

---

## Task 2: Create `packages/database` and Migrate Prisma

**Files:**
- Create: `/Users/lukeouko/silent-review/packages/database/package.json`
- Create: `/Users/lukeouko/silent-review/packages/database/tsconfig.json`
- Create: `/Users/lukeouko/silent-review/packages/database/src/client.ts`
- Create: `/Users/lukeouko/silent-review/packages/database/src/index.ts`
- Move: `/Users/lukeouko/silent-review/packages/shared/prisma/schema.prisma` → `/Users/lukeouko/silent-review/packages/database/prisma/schema.prisma`
- Move: `/Users/lukeouko/silent-review/packages/shared/prisma/seed.ts` → `/Users/lukeouko/silent-review/packages/database/prisma/seed.ts`
- Modify: `/Users/lukeouko/silent-review/packages/shared/package.json`
- Modify: `/Users/lukeouko/silent-review/packages/shared/tsconfig.json`
- Delete: `/Users/lukeouko/silent-review/packages/shared/prisma/` directory after move

**Interfaces:**
- Consumes: `@silent-review/shared` types/constants.
- Produces: `@silent-review/database` package exporting `prisma`, `checkDatabaseConnection()`, and Prisma-generated types.

- [ ] **Step 1: Create `packages/database/package.json`**

```json
{
  "name": "@silent-review/database",
  "version": "0.1.0",
  "private": true,
  "description": "Prisma client and connection utilities",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "prisma generate && tsc",
    "generate": "prisma generate",
    "migrate": "prisma migrate dev",
    "deploy": "prisma migrate deploy",
    "seed": "tsx prisma/seed.ts",
    "studio": "prisma studio",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@prisma/client": "^5.16.0",
    "@silent-review/shared": "workspace:*"
  },
  "devDependencies": {
    "prisma": "^5.16.0",
    "tsx": "^4.16.0",
    "typescript": "^5.5.0"
  }
}
```

- [ ] **Step 2: Create `packages/database/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "module": "ESNext",
    "moduleResolution": "Bundler"
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules", "prisma"]
}
```

- [ ] **Step 3: Move Prisma files**

```bash
cd /Users/lukeouko/silent-review
mkdir -p packages/database/prisma
mv packages/shared/prisma/schema.prisma packages/database/prisma/schema.prisma
mv packages/shared/prisma/seed.ts packages/database/prisma/seed.ts
rmdir packages/shared/prisma 2>/dev/null || rm -rf packages/shared/prisma
```

- [ ] **Step 4: Create `packages/database/src/client.ts`**

```typescript
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
});

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error("Database connection check failed:", error);
    return false;
  }
}
```

- [ ] **Step 5: Create `packages/database/src/index.ts`**

```typescript
export { checkDatabaseConnection, prisma } from "./client.js";
export * from "@prisma/client";
```

- [ ] **Step 6: Update `packages/shared/package.json`**

Remove Prisma scripts and dependencies. Final `packages/shared/package.json`:

```json
{
  "name": "@silent-review/shared",
  "version": "0.1.0",
  "private": true,
  "description": "Shared Zod schemas and TypeScript types",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0"
  }
}
```

- [ ] **Step 7: Update `packages/shared/tsconfig.json`**

Ensure it extends root tsconfig and has correct outDir/rootDir. Keep existing if already correct, otherwise set:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "module": "ESNext",
    "moduleResolution": "Bundler"
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules"]
}
```

- [ ] **Step 8: Install dependencies, generate Prisma client, and build**

```bash
cd /Users/lukeouko/silent-review
pnpm install
pnpm --filter database generate
pnpm --filter shared build
pnpm --filter database build
```

Expected: `packages/database/dist/` and `packages/shared/dist/` created with no TypeScript errors.

---

## Task 3: Update API and Web to Use New Package Boundaries

**Files:**
- Modify: `/Users/lukeouko/silent-review/apps/api/package.json`
- Modify: `/Users/lukeouko/silent-review/apps/web/package.json`
- Search and replace all imports of `@prisma/client` or Prisma types from `@silent-review/shared` across `apps/api/src` and `apps/web/src`.

**Interfaces:**
- Consumes: `@silent-review/database` (Prisma client, `checkDatabaseConnection`), `@silent-review/shared` (Zod schemas/types).

- [ ] **Step 1: Update `apps/api/package.json`**

Add `@silent-review/database` to dependencies:

```json
{
  "name": "@silent-review/api",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "start": "node dist/server.js",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@silent-review/database": "workspace:*",
    "@silent-review/shared": "workspace:*",
    "@aws-sdk/client-s3": "^3.600.0",
    "@aws-sdk/s3-presigned-post": "^3.600.0",
    "bcryptjs": "^2.4.3",
    "cookie-parser": "^1.4.6",
    "cors": "^2.8.5",
    "dotenv": "^16.4.0",
    "express": "^4.19.0",
    "ioredis": "^5.4.0",
    "jsonwebtoken": "^9.0.2",
    "passport": "^0.7.0",
    "passport-google-oauth20": "^2.0.0",
    "passport-local": "^1.0.0",
    "socket.io": "^4.7.0",
    "@socket.io/redis-adapter": "^8.3.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/cookie-parser": "^1.4.7",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.6",
    "@types/node": "^20.14.0",
    "@types/passport": "^1.0.16",
    "@types/passport-google-oauth20": "^2.0.16",
    "@types/passport-local": "^1.0.38",
    "tsx": "^4.16.0",
    "typescript": "^5.5.0"
  }
}
```

Also change `dev` script from `nodemon` to `tsx watch` to match the design spec.

- [ ] **Step 2: Update `apps/web/package.json`**

Add `@silent-review/database` as a devDependency only if the web app imports Prisma types. Otherwise leave unchanged. Keep existing dependencies.

- [ ] **Step 3: Find and update API imports**

Search for files importing Prisma client or types from `@silent-review/shared`:

```bash
cd /Users/lukeouko/silent-review
grep -R "from \"@silent-review/shared\"" apps/api/src --include="*.ts" -l
```

For each file that imports `PrismaClient` or Prisma-generated types, change the import source to `@silent-review/database`. Keep imports of Zod schemas from `@silent-review/shared`.

Example:
```typescript
// Before
import { prisma } from "@silent-review/shared";

// After
import { prisma } from "@silent-review/database";
```

- [ ] **Step 4: Verify API typechecks**

```bash
cd /Users/lukeouko/silent-review
pnpm install
pnpm --filter shared build
pnpm --filter database build
pnpm --filter api typecheck
```

Expected: No TypeScript errors.

- [ ] **Step 5: Verify web typechecks**

```bash
pnpm --filter web typecheck
```

Expected: No TypeScript errors.

---

## Task 4: Align Docker Compose and Environment with Foundation Spec

**Files:**
- Modify: `/Users/lukeouko/silent-review/docker-compose.yml`
- Modify: `/Users/lukeouko/silent-review/.env.example`
- Modify: `/Users/lukeouko/silent-review/apps/api/.env.example` if it exists
- Modify: `/Users/lukeouko/silent-review/apps/web/.env.example` if it exists

**Interfaces:**
- Produces: Docker Compose on standard ports, `.env.example` matching Docker defaults.

- [ ] **Step 1: Rewrite `docker-compose.yml`**

```yaml
services:
  postgres:
    image: postgres:15-alpine
    container_name: silent-review-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: silent_review
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d silent_review"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: silent-review-redis
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

- [ ] **Step 2: Rewrite root `.env.example`**

```bash
# App
NODE_ENV=development
PORT=3001
VITE_API_URL=http://localhost:3001

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/silent_review?schema=public

# Redis
REDIS_URL=redis://localhost:6379

# Secrets (required for auth features; not needed for foundation health check)
JWT_SECRET=change_me_jwt_secret_min_32_characters_long
JWT_REFRESH_SECRET=change_me_refresh_secret_min_32_chars

# OAuth - optional for local development
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# AWS - optional for local development
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET_NAME=silent-review-uploads

# App URLs
WEB_APP_URL=http://localhost:5173
API_URL=http://localhost:3001
```

- [ ] **Step 3: Update or remove app-specific `.env.example` files**

If `apps/api/.env.example` and `apps/web/.env.example` exist, either delete them (single source of truth at root) or update them to match root `.env.example`. Recommended: delete them to avoid confusion.

```bash
rm -f /Users/lukeouko/silent-review/apps/api/.env.example
rm -f /Users/lukeouko/silent-review/apps/web/.env.example
```

- [ ] **Step 4: Start infrastructure and verify**

```bash
cd /Users/lukeouko/silent-review
pnpm dev:infra
sleep 5
docker ps --filter name=silent-review
```

Expected: Both `silent-review-postgres` and `silent-review-redis` containers running, exposing ports `5432` and `6379`.

---

## Task 5: Update README and Verify Full Onboarding

**Files:**
- Modify: `/Users/lukeouko/silent-review/README.md`

**Interfaces:**
- Produces: README with pnpm-based setup instructions and verification of the full dev stack.

- [ ] **Step 1: Rewrite `README.md`**

```markdown
# Silent Review

A TikTok-style mobile web app where users create 5-second silent video reviews and others guess the rating 1–10.

## Tech Stack

- **Web:** Vite + React 18 + TypeScript + Tailwind CSS
- **API:** Express + TypeScript + tsx
- **Shared:** Zod schemas + TypeScript types
- **Database:** Prisma + PostgreSQL 15
- **Cache/Queue:** Redis 7
- **Monorepo:** pnpm workspaces

## Quick Start

> **Goal:** Clone and run in under 5 minutes.

### Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- [pnpm](https://pnpm.io/) >= 9
- [Docker Compose](https://docs.docker.com/compose/)

### 1. Clone and install

```bash
git clone <repo-url>
cd silent-review
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

The defaults in `.env.example` point to the local Docker services.

### 3. Start infrastructure

```bash
pnpm dev:infra
```

This starts PostgreSQL on `5432` and Redis on `6379` in the background.

### 4. Run database migrations

```bash
pnpm db:migrate
```

### 5. Start development servers

```bash
pnpm dev
```

- Web app: http://localhost:5173
- API: http://localhost:3001
- API health check: http://localhost:3001/health

## Useful Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Run API and web concurrently |
| `pnpm dev:api` | Run API only |
| `pnpm dev:web` | Run web only |
| `pnpm dev:infra` | Start PostgreSQL + Redis |
| `pnpm build` | Build all packages and apps |
| `pnpm typecheck` | Type-check all packages and apps |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:studio` | Open Prisma Studio |

## Project Structure

```
silent-review/
├── apps/
│   ├── api/              # Express API
│   └── web/              # Vite React web app
├── packages/
│   ├── shared/           # Zod schemas + TypeScript types
│   └── database/         # Prisma client + connection utilities
├── docker-compose.yml    # PostgreSQL + Redis
└── package.json          # Workspace scripts
```

## Environment Variables

All secrets are injectable via environment variables. See `.env.example` for the full list. Foundation-required variables:

- `NODE_ENV`
- `PORT`
- `DATABASE_URL`
- `REDIS_URL`

Optional variables enable additional features (auth, OAuth, upload) and can be left empty for local foundation development.

## License

[MIT](LICENSE)
```

- [ ] **Step 2: Run database migrations**

```bash
cd /Users/lukeouko/silent-review
cp .env.example .env
pnpm db:migrate
```

Expected: Prisma creates/updates the migration and applies all tables (`User`, `Review`, `Guess`, etc.).

- [ ] **Step 3: Start full dev stack and verify**

In one terminal:
```bash
cd /Users/lukeouko/silent-review
pnpm dev
```

Wait for both servers to start. In another terminal:

```bash
curl -s http://localhost:3001/health
```

Expected: JSON response with API status. If the app has no health endpoint, verify the API logs show `API running at http://localhost:3001`.

Open http://localhost:5173 in a browser. Expected: web app loads without errors.

- [ ] **Step 4: Stop infrastructure when done**

```bash
cd /Users/lukeouko/silent-review
docker compose down
```

---

## Self-Review Checklist

- [ ] **Spec coverage:** Every user constraint is addressed by a task.
  - Remove Turborepo → Task A1
  - Create `packages/database` and move Prisma → Task A2
  - Update consumers → Task A3
  - Align Docker/env → Task A4
  - Update README + verify onboarding → Task A5
- [ ] **Placeholder scan:** No TBD, TODO, or vague steps.
- [ ] **Type consistency:** All Prisma imports move from `@silent-review/shared` to `@silent-review/database`.
- [ ] **Build order:** Root `build` script builds `shared` → `database` → `api` → `web`.
- [ ] **No cloud deps for foundation:** Docker Compose uses local PostgreSQL/Redis; `.env.example` marks OAuth/AWS as optional.
