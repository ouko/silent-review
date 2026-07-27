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

### Access from an iPhone on the same Wi-Fi

```bash
bash scripts/dev-lan.sh
```

The script handles one-time setup automatically (creates `.env`, installs dependencies, starts PostgreSQL/Redis, runs migrations, and builds workspace packages) before exposing the app on your LAN. It prints a LAN URL (e.g. `http://192.168.1.42:5173`). Open that URL in Safari on your iPhone. Both devices must be on the same network.

**Keep it running in the background**

If the server stops when you close the terminal, use the daemon instead:

```bash
bash scripts/dev-lan-daemon.sh start   # start in background
bash scripts/dev-lan-daemon.sh status  # show status + LAN URL
bash scripts/dev-lan-daemon.sh logs    # tail the log
bash scripts/dev-lan-daemon.sh stop    # stop the daemon
```

If the page does not load on your iPhone, run the diagnostic script:

```bash
bash scripts/diagnose-lan.sh
```

It prints your Mac's LAN IP, checks whether the servers are listening, tests reachability from the Mac itself, and flags VPN/firewall issues.

Common fixes:

1. **Same Wi-Fi only** — cellular or a guest network will not work.
2. **Disable VPN on the Mac** — an active VPN (check for `utun` interfaces) often blocks inbound LAN traffic.
3. **Allow the app through macOS Firewall** — go to **System Settings > Privacy & Security > Firewall**, turn it off temporarily, or click **Options** and allow `node`, `tsx`, and `vite` if prompted.
4. **Check router AP isolation** — some routers block devices from talking to each other. Turn off "Client/AP isolation" if enabled.
5. **Disable iCloud Private Relay on the iPhone** — it can interfere with loading local HTTP addresses.
6. **Use the IP the script prints** — `localhost` only works on the Mac itself.

### Demo credentials

The seed script creates demo accounts you can use to try the app:

| Email | Password |
|-------|----------|
| `demo@silentreview.app` | `DemoPass123!` |
| `alice@silentreview.app` | `DemoPass123!` |
| `bob@silentreview.app` | `DemoPass123!` |

## Useful Scripts

| Script | Description |
|--------|-------------|
| `bash scripts/dev-lan.sh` | Start dev stack reachable from iPhone on same Wi-Fi |
| `bash scripts/dev-lan-daemon.sh start` | Start the LAN dev stack as a background daemon |
| `bash scripts/dev-lan-daemon.sh stop` | Stop the background LAN dev stack |
| `bash scripts/diagnose-lan.sh` | Diagnose iPhone-to-Mac LAN connectivity |
| `pnpm dev` | Run API and web concurrently |
| `pnpm dev:api` | Run API only |
| `pnpm dev:web` | Run web only |
| `pnpm dev:infra` | Start PostgreSQL + Redis |
| `pnpm build` | Build all packages and apps |
| `pnpm typecheck` | Type-check all packages and apps |
| `pnpm --filter api test` | Run API unit/integration tests |
| `pnpm --filter web test` | Run web component tests |
| `pnpm test:e2e` | Run Playwright E2E tests |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm deploy` | Deploy to production server |

## Testing

Run the test suites from the repo root:

```bash
pnpm typecheck        # Type-check all packages and apps
pnpm --filter web test # Web component tests
pnpm --filter api test # API unit/integration tests
pnpm test:e2e         # Playwright E2E tests
```

E2E tests require the dev stack to be running (`pnpm start:dev` or `bash scripts/dev-lan-daemon.sh start`). They run against `http://localhost:5173` by default.

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

If you want to use S3/CloudFront in production, set the AWS variables in `.env.example` and replace the local upload service at `apps/api/src/upload/upload.service.ts` with your S3 implementation.

Optional variables enable additional features (OAuth, production upload) and can be left empty for local foundation development.

## License

[MIT](LICENSE)
