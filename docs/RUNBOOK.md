# Operations Runbook — Silent Review

The single source of truth for keeping the app running. If you touch
production, read this first. Last verified: 2026-07-31.

---

## 1. Where everything lives

| Thing | Location |
|---|---|
| Code | GitHub: `github.com/ouko/silent-review` |
| Working branch | `feat/video-moderation` (all current work; PR to `main` pending) |
| Production server | DigitalOcean droplet `ubuntu-s-1vcpu-1gb-blr1` (1 vCPU / 1 GB RAM + 2 GB swap) |
| Public IP | `168.144.121.93` |
| Live URL | `https://168.144.121.93.sslip.io` (sslip.io = free DNS, no domain purchased) |
| Repo on server | `/root/silent-review` (SSH: root@168.144.121.93, deploy key on GitHub) |
| Stack | Docker Compose (`docker-compose.prod.yml`): nginx :80/:443 → api :3001 (internal) → postgres, redis |
| Uploads | `uploads_data` Docker volume (AES-256-GCM encrypted at rest) |
| Database | `postgres_data` volume, db `silent_review` |
| Secrets | `.env.prod` on the VPS only (never committed). `UPLOAD_ENCRYPTION_KEY` must also be in the password manager — without it, uploads are unreadable forever |
| Docs | `README.md` → this file · `docs/` (DEPLOYMENT, PRELAUNCH, GO_LIVE_REPORT, SECURITY, API) |

## 2. Deploying (the only way)

```bash
cd ~/silent-review
git fetch origin
git reset --hard origin/feat/video-moderation   # or origin/main once merged
git log --oneline -1                            # confirm the expected commit
ENV_FILE=.env.prod bash scripts/deploy.sh
```

`deploy.sh` does: branch-aware pull → dependency install (devDeps forced) →
web build (`VITE_API_URL=""`, same-origin) → docker build/start → migrations
via `scripts/migrate-psql.sh` → health check with auto-rollback.

**Migrations run through `scripts/migrate-psql.sh`** (psql inside the postgres
container). Do NOT run `prisma migrate deploy` from the host or a container —
the Prisma engine fails on this host (Alpine OpenSSL / 1 GB RAM).

## 3. Day-to-day operations

```bash
docker ps --format '{{.Names}} {{.Status}}'                              # stack health
docker logs silent-review-api --tail 50                                  # API logs
docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f nginx
docker compose -f docker-compose.prod.yml --env-file .env.prod restart api
curl -s https://168.144.121.93.sslip.io/api/health                       # expect {"status":"ok"}
```

**Backups:** `scripts/backup.sh` (pg_dump via container → S3, 7-day retention).
Cron: `0 3 * * * /root/silent-review/scripts/backup.sh >> /var/log/silent-review-backup.log 2>&1`
(AWS vars required in `.env.prod`; rehearse a restore once.)

**Disk space (recurring issue!):** builds fill the disk with build cache.
If a deploy fails at `COPY --from=builder`:
```bash
docker builder prune -af && docker image prune -f
```

**SSL certificates:** Let's Encrypt via certbot, webroot renewals:
`sudo certbot renew` (certs in `data/certbot/conf` → mounted into nginx).
HTTPS config: `nginx/conf.d/ssl.conf` (generated from `ssl.conf.template`).

## 4. Admin tasks

- **Make a user admin:** `docker exec -i silent-review-postgres psql -U postgres -d silent_review -c "UPDATE \"User\" SET role='ADMIN' WHERE email='you@example.com';"` (log out/in after)
- **Admin UI:** `https://168.144.121.93.sslip.io/admin` — moderation queue (approve/reject), users (ban/unban, make merchant), products (assign owner to merchant)
- **Publish stuck reviews (one-off, rarely needed now — boot recovery handles it):**
  ```sql
  UPDATE "Review" r SET status='PUBLISHED' FROM "VideoModeration" m
  WHERE m."reviewId"=r.id AND m.status='PASS' AND r.status='UNDER_REVIEW';
  ```
- **Bust feed cache:** `docker exec silent-review-redis redis-cli --scan --pattern 'feed:*' | xargs -r docker exec -i silent-review-redis redis-cli del`

## 5. Architecture in one minute

- **Web**: React SPA (Vite), served by nginx from `apps/web/dist`. Bottom nav: Home / Create / Grow / Profile. `/admin` (admins), `/analytics` (creator + merchant dashboards).
- **API**: Express + Prisma. Auth = JWT access token + httpOnly refresh cookie (Secure under HTTPS).
- **Upload pipeline**: validate → rectify (strip audio, trim to 5s, upscale ≥480p, ≥24fps) → feed-optimize (720p, +faststart) → AES-256-GCM encrypt → save → thumbnail → async moderation (skin/static/dark) → PASS auto-publishes, REJECT soft-deletes, REVIEW waits in the admin queue.
- **Moderation queue is in-memory** — API restarts drop pending items; `recoverStuckReviews()` runs at boot and re-enqueues them (this was the "my content never reaches the feed" bug).
- **Skin threshold:** `VIDEO_MODERATION_SKIN_THRESHOLD` (default 0.7, avg across frames). Hand-held product videos must stay under it — tune in `.env.prod` if needed.

## 6. Failure playbook (symptom → fix)

| Symptom | Fix |
|---|---|
| Deploy fails `COPY --from=builder` | Disk full → `docker builder prune -af` |
| `tsc: not found` during build | devDeps pruned by NODE_ENV=production → `NODE_ENV=development pnpm install --frozen-lockfile` |
| API unhealthy: `libssl.so.1.1` | Old image; rebuild (Dockerfile pins `PRISMA_QUERY_ENGINE_LIBRARY`) |
| `Can't reach database server at postgres:5432` | Migrations from host — use `scripts/migrate-psql.sh` |
| All API routes 404 but health ok | nginx prefix strip — already fixed; never add trailing `/` to `proxy_pass http://api` |
| Feed empty after posting | Review stuck UNDER_REVIEW → boot recovery or backfill SQL (§4) |
| "mostly skin-toned" on a product video | Raise `VIDEO_MODERATION_SKIN_THRESHOLD` in `.env.prod`, restart api |
| 401 loop / blank page for guests | Fixed in axios interceptor — don't retry auth-entry 401s |
| iPhone camera unavailable | Needs HTTPS; prod is fine, dev uses `scripts/dev-lan-daemon.sh` + `certs/local-ca.pem` trusted on the phone |
| Uploads unreadable | `UPLOAD_ENCRYPTION_KEY` missing/changed — restore the original key |

## 7. Verification gates

```bash
pnpm typecheck && pnpm --filter api test && pnpm --filter web test     # local
PLAYWRIGHT_BASE_URL=https://168.144.121.93.sslip.io pnpm test:e2e e2e/prod-smoke.spec.ts   # live gate
```

## 8. Accounts & access inventory

- **GitHub:** repo `ouko/silent-review` (private). VPS authenticates with a deploy key (read-only).
- **DigitalOcean:** droplet + SSH root. Console paste mangles long commands — prefer a real SSH client.
- **sslip.io:** free DNS (no account). If a real domain is bought later: point A record, re-run certbot, update `WEB_APP_URL` + `nginx/conf.d/ssl.conf`.
- **Let's Encrypt:** certbot on the VPS.
- **AWS:** S3 for backups (keys in `.env.prod`).
- **Password manager:** `UPLOAD_ENCRYPTION_KEY`, JWT secrets, DO root password, AWS keys.
