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
- `JWT_SECRET` (min 32 characters; `.env.example` provides a dev default)
- `JWT_REFRESH_SECRET` (min 32 characters; `.env.example` provides a dev default)

Optional variables enable additional features (OAuth, upload) and can be left empty for local foundation development.

## License

[MIT](LICENSE)
