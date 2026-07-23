# Deployment Guide

This guide covers deploying Silent Review to a single VPS using Docker Compose.

## Prerequisites

- A VPS with at least 2 vCPU, 4 GB RAM, and 40 GB SSD.
- Ubuntu 22.04 LTS (recommended).
- Docker and Docker Compose v2.17+ installed.
- A domain name pointing to the VPS.
- AWS account for S3 backups (optional but recommended).

## Server Setup

1. SSH into the server and clone the repo:

```bash
git clone <repo-url> silent-review
cd silent-review
```

2. Install pnpm and dependencies:

```bash
corepack enable
pnpm install --frozen-lockfile
```

3. Create a production environment file:

```bash
cp .env.example .env.prod
```

Fill in `.env.prod` with production values. At minimum set:

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://postgres:<password>@postgres:5432/silent_review
REDIS_URL=redis://redis:6379
JWT_SECRET=<random-64-char-hex>
JWT_REFRESH_SECRET=<random-64-char-hex>
WEB_APP_URL=https://your-domain.com
POSTGRES_PASSWORD=<strong-password>
```

## SSL with Let's Encrypt

1. Install Certbot on the host:

```bash
sudo apt install certbot
```

2. Obtain certificates:

```bash
sudo certbot certonly --webroot -w ./data/certbot/www -d your-domain.com
```

3. Update `nginx/nginx.conf`:
   - Uncomment the SSL server block.
   - Replace `example.com` with your domain.
   - Uncomment the HTTP-to-HTTPS redirect.

4. Reload nginx:

```bash
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

## Deploy

Run the deployment script:

```bash
pnpm deploy
```

This will:
1. Pull the latest code.
2. Install dependencies.
3. Build the web app.
4. Build and start the production Docker stack.
5. Run database migrations.
6. Perform a health check and roll back automatically on failure.

## Backup

Daily database backups to S3 are handled by `scripts/backup.sh`. Add it to cron:

```bash
0 3 * * * /home/ubuntu/silent-review/scripts/backup.sh >> /var/log/silent-review-backup.log 2>&1
```

Required environment variables in `.env.prod`:

```env
DATABASE_URL=postgresql://postgres:<password>@localhost:5432/silent_review
S3_BUCKET_NAME=silent-review-backups
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

## Monitoring

- Health endpoint: `https://your-domain.com/api/health`
- Status page: `https://your-domain.com/status`
- Logs: `docker compose -f docker-compose.prod.yml logs -f api`

## Updates

Push to `main` triggers the GitHub Actions deploy workflow if you configure `SSH_HOST`, `SSH_USER`, and `SSH_PRIVATE_KEY` secrets.

## Rollback

If a deploy fails, the deploy script rolls back automatically. To manually roll back:

```bash
docker tag silent-review/api:previous silent-review/api:latest
docker compose -f docker-compose.prod.yml up -d api
```
