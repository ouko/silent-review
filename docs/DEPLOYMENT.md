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
UPLOAD_ENCRYPTION_KEY=<openssl rand -hex 32>
```

Notes:

- `UPLOAD_ENCRYPTION_KEY` encrypts uploaded media at rest (AES-256-GCM).
  Back it up somewhere safe: without it, existing uploads are unreadable.
- `VITE_API_URL` is forced to empty by `scripts/deploy.sh` so the web bundle
  uses same-origin relative URLs through nginx. Do not set it in `.env.prod`.
- Uploaded media persists in the `uploads_data` Docker volume across deploys.

## SSL with Let's Encrypt

1. Install Certbot on the host:

```bash
sudo apt install -y certbot
```

2. Obtain the first certificate (the stack is not running yet, so standalone
mode uses port 80 directly). Write it into the directory compose mounts:

```bash
mkdir -p data/certbot/www data/certbot/conf
sudo certbot certonly --standalone -d your-domain.com \
  --config-dir "$PWD/data/certbot/conf" \
  --work-dir /tmp/certbot-work --logs-dir /tmp/certbot-logs
```

3. Activate the HTTPS server block (one command, no manual editing):

```bash
sed 's/example.com/your-domain.com/g' nginx/conf.d/ssl.conf.template > nginx/conf.d/ssl.conf
```

4. Deploy (nginx now serves HTTPS; renewals use the webroot challenge that is
already configured on port 80):

```bash
pnpm deploy
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
DATABASE_URL=postgresql://postgres:<password>@postgres:5432/silent_review
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
