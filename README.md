# Silent Review

A TikTok-style mobile web app where users create 5-second silent video reviews and others guess the rating (1–10) before the reveal.

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **Backend:** Node.js + Express + TypeScript + Socket.io
- **Database:** PostgreSQL + Prisma
- **Cache/Realtime:** Redis
- **Video:** AWS S3 + CloudFront
- **Auth:** Google, Apple, email/password (TikTok/Instagram stubbed)

## Project Structure

```
silent-review/
├── apps/
│   ├── web/        # Vite React app
│   └── api/        # Express API server
├── packages/
│   └── shared/     # Prisma schema, generated client, shared types
└── docker-compose.yml
```

## Prerequisites

- Node.js >= 20
- pnpm >= 9
- Docker & Docker Compose

## Setup

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Start Postgres and Redis**
   ```bash
   docker compose up -d
   ```

3. **Configure environment**
   ```bash
   cp .env.example apps/api/.env
   cp .env.example apps/web/.env
   ```
   Fill in OAuth and AWS credentials where needed. For local development without AWS, the upload endpoint returns a stub URL.

4. **Run database migrations**
   ```bash
   pnpm db:migrate
   ```

5. **Generate Prisma client**
   ```bash
   pnpm db:generate
   ```

6. **Start dev servers**
   ```bash
   pnpm dev
   ```
   - Web: http://localhost:5173
   - API: http://localhost:3001

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start web and API in dev mode |
| `pnpm build` | Build all packages |
| `pnpm typecheck` | Type-check all packages |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:studio` | Open Prisma Studio |

## License

MIT
