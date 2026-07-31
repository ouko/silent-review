# Silent Review

A short-form video product-review app: creators post 5-second silent product
reviews, viewers guess the 1–10 rating before revealing it, and merchants get
product analytics. React/Vite SPA + Express/Prisma API + PostgreSQL + Redis,
deployed as a Docker Compose stack on a single VPS.

> **Operating this app? Read [`docs/RUNBOOK.md`](docs/RUNBOOK.md) first.**
> It has the live infrastructure map (GitHub + DigitalOcean), deploy procedure,
> secrets locations, backups, and the recovery guide for every failure we've hit.

## Quick links

- **Runbook (ops, prod access, deploys, backups, recovery):** [`docs/RUNBOOK.md`](docs/RUNBOOK.md)
- **Go-live report (audit + issue history):** [`docs/GO_LIVE_REPORT.md`](docs/GO_LIVE_REPORT.md)
- **Pre-launch checklist:** [`docs/PRELAUNCH.md`](docs/PRELAUNCH.md)
- Deployment guide: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) · Architecture: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · API: [`docs/API.md`](docs/API.md)

## Development

```bash
bash scripts/start-app.sh        # everything: infra + API + web over HTTPS (LAN-ready)
bash scripts/start-app.sh stop   # stop dev servers
```

Other scripts: `scripts/deploy.sh` (production deploy),
`scripts/migrate-psql.sh` (database migrations),
`scripts/backup.sh` (daily DB backup to S3).

## Testing

```bash
pnpm typecheck
pnpm --filter api test
pnpm --filter web test
pnpm test:e2e --workers=1                                  # local full suite
PLAYWRIGHT_BASE_URL=https://<domain> pnpm test:e2e e2e/prod-smoke.spec.ts   # post-deploy gate
```
