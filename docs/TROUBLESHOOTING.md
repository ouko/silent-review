# Troubleshooting

Common issues and how to resolve them.

## Development

### `pnpm install` fails

- Ensure pnpm >= 9 is installed: `corepack enable && corepack prepare pnpm@9.12.0 --activate`
- Delete `node_modules` and try again: `pnpm clean && pnpm install`

### Database connection errors

- Confirm PostgreSQL is running: `docker compose ps`
- Check `DATABASE_URL` in `.env` matches the Docker Compose credentials.
- Run migrations: `pnpm db:migrate`

### Prisma client is out of date

```bash
pnpm --filter database generate
```

### API tests fail with module errors

- API tests require ESM support: `node --experimental-vm-modules`
- The `test` script already includes this flag.

### E2E tests fail to start

- Ensure the dev stack is running: `pnpm start:dev`
- Install Playwright browsers: `pnpm exec playwright install chromium`

## Production

### Deploy script health check fails

- Check API logs: `docker compose -f docker-compose.prod.yml logs api`
- Verify `.env.prod` has all required variables.
- Ensure migrations ran: `pnpm --filter database run deploy`

### SSL certificate errors

- Confirm certificates exist at `./data/certbot/conf/live/your-domain/`
- Check nginx logs: `docker compose -f docker-compose.prod.yml logs nginx`

### Backups not uploading to S3

- Verify AWS credentials in `.env.prod`.
- Ensure the S3 bucket exists and the IAM user has `PutObject` and `DeleteObject` permissions.

### Service worker not updating

- Browsers cache service workers aggressively. Increment `CACHE_NAME` in `apps/web/src/service-worker.ts` when shipping a breaking change.

## General

### Forgot demo password

Demo accounts are seeded with `DemoPass123!`. To change them, edit `packages/database/prisma/seed.ts` and re-run `pnpm db:seed`.
