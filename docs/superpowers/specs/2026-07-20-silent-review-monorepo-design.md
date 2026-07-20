# Silent Review — Monorepo Foundation Design

**Date:** 2026-07-20  
**Status:** Approved  
**Approach:** Compiled Workspace Packages (Approach A)

---

## 1. Goal

Establish a production-ready monorepo foundation for the Silent Review full-stack application that enables rapid, independent development of web and API components.

## 2. Success Criteria

- Monorepo structure supports concurrent frontend and backend development.
- All configuration files are type-safe and environment-aware.
- Docker Compose provides one-command local infrastructure setup.
- A new developer can clone and run the app in under 5 minutes.

## 3. Constraints

- Use pnpm workspaces (no Turborepo initially).
- No cloud dependencies required for local development.
- All secrets must be injectable via environment variables.

## 4. Product Context

Silent Review is a TikTok-style mobile web app where users create 5-second silent video reviews and other users guess the rating (1–10). The architecture must be platform-agnostic and not tied to any single social platform.

## 5. Directory Structure

```
silent-review/
├── apps/
│   ├── web/                 # Vite + React 18 + TypeScript + Tailwind CSS
│   └── api/                 # Express + TypeScript + tsx dev runner
├── packages/
│   ├── shared/              # Zod schemas + TypeScript types shared across web/api
│   └── database/            # Prisma setup with connection utilities
├── docker-compose.yml       # PostgreSQL 15 + Redis 7
├── .env.example             # All required variables documented
├── .gitignore               # Root ignore rules
├── README.md                # Setup instructions
├── package.json             # Workspace config + shared scripts
└── tsconfig.base.json       # Shared TypeScript options
```

## 6. Package Boundaries

Dependency graph:

```
web ──► shared
api  ──► shared
api  ──► database
database ──► shared
```

- `packages/shared` has no internal dependencies.
- `packages/shared` and `packages/database` are compiled packages that emit `dist/`.
- Apps consume packages via `"@silent-review/shared": "workspace:*"` and `"@silent-review/database": "workspace:*"`.

## 7. Technology Choices

| Concern | Choice |
|---------|--------|
| Package manager | pnpm (pinned in `packageManager`) |
| Web app | Vite 5, React 18, TypeScript 5, Tailwind CSS 3 |
| API | Express 4, TypeScript 5, `tsx` dev runner |
| Validation / types | Zod |
| Database ORM | Prisma 5 |
| Database | PostgreSQL 15 |
| Cache / queue | Redis 7 |
| Dev orchestration | `concurrently` |

## 8. Minimal Wiring Beyond Configuration

The foundation includes a small amount of runnable code to prove the stack works end-to-end:

- **`apps/web` landing page**: displays the product name and calls the API health endpoint, showing connection status.
- **`apps/api` health endpoint**: `GET /health` returns `{ status, db, timestamp }` using the database connection helper.
- **`packages/shared` schemas**: Zod schemas for `Review` and `Guess` plus inferred TypeScript types.
- **`packages/database`**: Prisma schema with `Review` and `Guess` models, a singleton `PrismaClient`, and `checkDatabaseConnection()`.

No feature implementation (upload, feed, guessing) is included in this foundation.

## 9. Build & Development Scripts

Root `package.json` scripts:

```json
{
  "dev": "concurrently \"pnpm dev:api\" \"pnpm dev:web\"",
  "dev:api": "pnpm --filter api dev",
  "dev:web": "pnpm --filter web dev",
  "dev:infra": "docker compose up -d",
  "build": "pnpm --filter shared build && pnpm --filter database build && pnpm --filter api build && pnpm --filter web build",
  "typecheck": "pnpm -r typecheck",
  "lint": "pnpm -r lint",
  "db:generate": "pnpm --filter database generate",
  "db:migrate": "pnpm --filter database migrate",
  "db:studio": "pnpm --filter database studio"
}
```

Build order is enforced by the root `build` script: `shared` first (because `database` imports it), then `database`, then `api`, then `web`.

## 10. Docker Compose Local Infrastructure

```yaml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: silent_review
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

One command: `pnpm dev:infra`.

## 11. Environment Variables

`.env.example` documents every required variable:

```bash
# App
NODE_ENV=development
PORT=3001
VITE_API_URL=http://localhost:3001

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/silent_review?schema=public

# Redis
REDIS_URL=redis://localhost:6379

# Secrets (not used by the foundation, but reserved for auth/session middleware)
SESSION_SECRET=change-me-in-production
```

The API validates required environment variables (`NODE_ENV`, `PORT`, `DATABASE_URL`, `REDIS_URL`) at startup and fails fast with clear error messages. No secrets are committed.

## 12. Developer Onboarding

Target time: under 5 minutes.

1. `git clone <repo> && cd silent-review`
2. `pnpm install`
3. `cp .env.example .env`
4. `pnpm dev:infra`
5. `pnpm db:migrate`
6. `pnpm dev`

Then open `http://localhost:5173`. The API is available at `http://localhost:3001`.

## 13. Type Safety & Environment Awareness

- Root `tsconfig.base.json` is extended by all packages and apps.
- Each package/app has its own `tsconfig.json` for local paths and entry points.
- `apps/api/src/env.ts` validates environment variables with Zod.
- `packages/shared` uses Zod for runtime validation and infers TypeScript types from schemas.

## 14. Testing

No test suite is included in this foundation deliverable. Reserved patterns:

- `apps/web`: Vitest + React Testing Library (to be added).
- `apps/api`: Vitest + Supertest (to be added).
- `packages/shared` / `packages/database`: Vitest (to be added).

## 15. Domain Models (Foundation Only)

### Review

- `id`: string (cuid)
- `authorId`: string
- `videoUrl`: string
- `rating`: integer (1–10)
- `createdAt`: datetime
- `updatedAt`: datetime

### Guess

- `id`: string (cuid)
- `reviewId`: string
- `userId`: string
- `guessedRating`: integer (1–10)
- `createdAt`: datetime

These models support the future feature set while keeping the foundation focused.

## 16. Decisions & Trade-offs

- **Compiled workspace packages vs. source imports**: Compiled packages were chosen because they enforce clean boundaries, work identically in dev and production, and avoid path-resolution complexity as the monorepo grows.
- **pnpm workspaces vs. Turborepo**: pnpm workspaces keep tooling minimal while still supporting filtered commands and workspace dependencies.
- **Express vs. Fastify**: Express chosen for familiarity and broad ecosystem; easy to swap later if needed.
- **Prisma vs. Drizzle**: Prisma chosen for its mature migration system and excellent TypeScript client.
- **Redis included now**: Provisioned for future sessions, rate limiting, and background job queues even though it is not used by the foundation code.
