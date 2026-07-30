# Pre-Launch Runbook — Silent Review

Everything needed to take the app to production, plus the crucial operational
knowledge gathered during the pre-launch audit (2026-07-30). Keep this document
current as items are completed.

## Launch sequence

1. **Merge `feat/video-moderation` → `main`.** PR opened from
   https://github.com/ouko/silent-review/compare/main...feat/video-moderation
   The deploy pipeline pulls from `main`, so nothing ships until this merges.
2. **Confirm CI green** on the PR (Test workflow: unit tests + e2e on Ubuntu).
3. **Provision the VPS** (2 vCPU / 4 GB / 40 GB SSD, Ubuntu 22.04, Docker
   Compose v2.17+), point the domain's DNS at it.
4. **Create `.env.prod`** (see below) and obtain TLS certificates with certbot
   (`docs/DEPLOYMENT.md`), then uncomment the SSL block in `nginx/nginx.conf`.
5. **Deploy:** `pnpm deploy` on the VPS (builds web, builds/starts the stack,
   runs migrations, health-checks, auto-rolls-back on failure).
6. **Smoke test in prod:** register, upload a >5s video with audio (should be
   normalized and appear on the profile), feed loads, follow/unfollow,
   comments, realtime notifications.
7. **Set up the backup cron and rehearse a restore once** (see Backups).

## `.env.prod` requirements

| Variable | Notes |
|---|---|
| `POSTGRES_PASSWORD` | Strong, unique. |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | `openssl rand -hex 32` each. |
| `UPLOAD_ENCRYPTION_KEY` | `openssl rand -hex 32` → **back this up separately**. Without it, every encrypted upload is permanently unreadable. |
| `DATABASE_URL`, `REDIS_URL` | Point at the compose services (`postgres`, `redis`). |
| `WEB_APP_URL` | `https://your-domain.com` — drives CORS, Socket.IO origin, invite links, and the `Secure` cookie flag. |
| `VITE_API_URL` | Leave unset/empty. `deploy.sh` forces it empty so the bundle uses same-origin URLs. Setting it will break prod. |
| OAuth (`GOOGLE_*`, `APPLE_*`, `TIKTOK_*`, `INSTAGRAM_*`) | Only if enabling social login. |
| AWS (`AWS_*`, `S3_BUCKET_NAME`) | Required for backups. |

## Crucial operational knowledge

### Uploads and media

- **Persistence:** media lives in the `uploads_data` Docker volume mounted at
  `/app/uploads` in the API container. Before this, every deploy wiped uploads.
- **At-rest encryption:** files on disk are AES-256-GCM ciphertext with an
  `SRE1` header (see `apps/api/src/upload/storageCrypto.ts`). Legacy plaintext
  files still serve. The serving handler (`serveUploads.ts`) decrypts
  transparently and supports HTTP Range (required by iOS Safari video).
- **Upload normalization:** the API auto-rectifies uploads instead of
  rejecting them — strips audio, trims to the first 5s, upscales the shortest
  side to ≥480px, resamples to ≥30fps (`rectifyVideo` in `videoValidator.ts`).
  Only genuinely unusable content (too short, corrupt, still image, too dark)
  is rejected. Moderation reads encrypted files via a temporary plaintext
  bridge (`withPlaintextCopy`).
- **ffmpeg is required in the API image** for all of the above; it is
  installed by `apps/api/Dockerfile`. Do not remove it.

### Auth and web client

- The axios interceptor (`apps/web/src/lib/api.ts`) must never run its
  401-retry logic for `/api/auth/login`, `/register`, or `/refresh` — doing so
  caused an infinite 401 loop for guests and wiped login error messages.
- Refresh cookies are `Secure` whenever `WEB_APP_URL` is https.
- The service worker (`apps/web/src/service-worker.ts`) is network-first for
  navigations (deploys reach users immediately) and never caches `/uploads/`
  or `/api/`. Bump `CACHE_NAME` if its strategy changes again.

### Local/LAN development

- `bash scripts/dev-lan-daemon.sh start` runs the stack over **HTTPS** with a
  local CA (`scripts/dev-cert.sh`, certs in gitignored `certs/`). Plain
  `pnpm dev` stays HTTP for laptop/e2e work.
- iPhone setup (one-time): AirDrop `certs/local-ca.pem` → install profile →
  enable in Settings → General → About → Certificate Trust Settings. Then open
  `https://<LAN-IP>:5173`. Camera recording requires this (secure context).
- Dev certs are iOS-compliant (≤398-day server cert, CA with keyCertSign).
  The server cert is re-issued when the LAN IP changes; the CA is valid 10y.

### Testing

- Full checks: `pnpm typecheck`, `pnpm --filter api test` (82 tests),
  `pnpm --filter web test` (12 tests), `pnpm test:e2e --workers=1`.
- E2E against the HTTPS LAN stack needs
  `PLAYWRIGHT_BASE_URL=https://localhost:5173` (config tolerates the local CA).
- Occasional single-test failures under heavy machine load (e.g. concurrent
  docker builds) are flakes; rerun the spec in isolation before investigating.
- Playwright specs have no `webServer` block — the dev stack must be running.

### Backups and monitoring

- `scripts/backup.sh` dumps postgres **through the container**
  (`docker compose exec`) — postgres has no published host port in prod.
  Cron: `0 3 * * * /home/ubuntu/silent-review/scripts/backup.sh >> /var/log/silent-review-backup.log 2>&1`
- Backups upload to `s3://$S3_BUCKET_NAME/backups/` with 7-day retention.
- Health: `https://your-domain.com/api/health`. Logs:
  `docker compose -f docker-compose.prod.yml logs -f api`.
- GitHub Actions deploy needs repo secrets `SSH_HOST`, `SSH_USER`,
  `SSH_PRIVATE_KEY`; until set, deploy manually over SSH.

### Production data

- Never run `pnpm db:seed` against production — it creates demo users and
  demo reviews. `deploy.sh` runs migrations only.
- `docker-compose.prod.yml` requires: `POSTGRES_PASSWORD`, `JWT_SECRET`,
  `JWT_REFRESH_SECRET`, `UPLOAD_ENCRYPTION_KEY` (startup fails without them).

## Audit validation record (2026-07-30)

- Typecheck: all workspace packages clean.
- Unit/integration: API 82/82, web 12/12.
- Production API Docker image builds; contains node 20 + ffmpeg/ffprobe 8.0.1.
- E2E: 45 passed, 5 intentionally skipped, 1 flaky (passes in isolation).
- `docker compose -f docker-compose.prod.yml config` valid.
