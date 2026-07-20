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

### One-command start

```bash
pnpm start:dev
```

This script will:
1. Create `.env` from `.env.example` if it doesn't exist
2. Install dependencies if needed
3. Start PostgreSQL and Redis via Docker Compose
4. Generate the Prisma client and run migrations
5. Build the shared and database packages
6. Start the API and web dev servers

### Manual steps

```bash
git clone <repo-url>
cd silent-review
pnpm install
cp .env.example .env
pnpm dev:infra
pnpm db:migrate
pnpm dev
```

- Web app: http://localhost:5173
- API: http://localhost:3001
- API health check: http://localhost:3001/health

### Demo credentials

The seed script creates demo accounts you can use to try the app:

| Email | Password |
|-------|----------|
| `demo@silentreview.app` | `DemoPass123!` |
| `alice@silentreview.app` | `AlicePass123!` |
| `bob@silentreview.app` | `BobPass123!` |

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

### Local uploads (no AWS required)

By default, uploaded 5-second review videos are stored on disk in the `uploads/` directory and served by the API at `/uploads/<filename>`. No AWS credentials are needed for local development.

If you want to use S3/CloudFront in production, set the AWS variables in `.env.example` and replace the local upload service at `apps/api/src/services/localUpload.ts` with your S3 implementation.

Optional variables enable additional features (OAuth, production upload) and can be left empty for local foundation development.

## License

[MIT](LICENSE)
