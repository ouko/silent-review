# Go-Live Report — Silent Review

Date: 2026-07-30
Environment: production @ https://168.144.121.93.sslip.io (DigitalOcean droplet, Docker Compose stack)
Codebase: `feat/video-moderation` (PR pending merge to `main`)

## 1. Verification Summary

| Gate | Scope | Result |
|---|---|---|
| Typecheck | all 4 workspace packages | PASS |
| API unit/integration | 13 suites, 82 tests | PASS |
| Web unit | 4 files, 12 tests | PASS |
| Local E2E (Playwright) | full suite, Mobile Chrome + iPhone Safari | see §4 |
| Production smoke E2E | `e2e/prod-smoke.spec.ts` vs live server | see §4 |
| Production Docker image | API image build, ffmpeg present | PASS |
| Prod compose config | `docker compose config` validation | PASS |
| Live endpoints | health, web, auth/providers, feed, upload | PASS |

## 2. Issues Found and Resolved (this cycle)

### Deployment / Infrastructure

| # | Issue | Root cause | Resolution |
|---|---|---|---|
| 1 | Uploads wiped on every deploy | no volume for `/app/uploads` | `uploads_data` volume in prod compose |
| 2 | At-rest encryption silently off in prod | `UPLOAD_ENCRYPTION_KEY` not passed to container | required in compose + docs |
| 3 | Video pipeline dead in prod | API image had no ffmpeg | `apk add ffmpeg` in Dockerfile, verified in image |
| 4 | Realtime broken behind nginx | no `/socket.io/` proxy block | added with websocket headers |
| 5 | Prod bundle could bake `localhost:3001` | `VITE_API_URL` from dev .env | forced empty in `deploy.sh` (same-origin) |
| 6 | Backups would fail day one | postgres has no published host port | `backup.sh` dumps via `docker compose exec` |
| 7 | Local CA key shipped into images | `certs/` not in `.dockerignore` | excluded |
| 8 | Users pinned to stale app versions | service worker cache-first for HTML | network-first navigations, no `/uploads/` caching, cache v2 |
| 9 | Deploy fails: `tsc: not found` | `NODE_ENV=production` pruned devDependencies | install with `NODE_ENV=development` in `deploy.sh` |
| 10 | Deploy git failures | hardcoded `git pull origin main` on branch checkout | pull checked-out branch |
| 11 | API boot crash (Prisma) | Alpine has OpenSSL 3, Prisma wanted libssl.so.1.1 | `binaryTargets` + `PRISMA_QUERY_ENGINE_LIBRARY` pin |
| 12 | Migrations unreachable/failing | host can't reach postgres; Prisma migrate engine broken on Alpine/small hosts | `scripts/migrate-psql.sh` applies SQL via psql in the postgres container; wired into `deploy.sh` |
| 13 | All API routes 404 in prod | nginx `proxy_pass http://api/` stripped the `/api` prefix | removed trailing slash in `ssl.conf.template` |
| 14 | nginx SSL required hand-editing | incomplete commented template | complete `conf.d/ssl.conf.template`, one `sed` to activate |

### Application

| # | Issue | Root cause | Resolution |
|---|---|---|---|
| 15 | Infinite 401 loop, blank page for guests | refresh call re-entered the axios retry interceptor | skip retry for auth-entry calls |
| 16 | Login errors wiped | interceptor hard-redirected on login 401 | login/register 401s reach the form |
| 17 | Profile not scrollable; sheets clipped | `overflow-hidden` roots, unconstrained lists | full-page scroll, sticky tabs, constrained sheet lists |
| 18 | No tap feedback on stats/nav | no-op handlers when already selected | scroll-to-reviews, scroll-to-top on active nav |
| 19 | "undefined is not an object" on record | `navigator.mediaDevices` undefined on insecure origins | guarded, friendly messages, gallery fallback |
| 20 | Recordings/uploads rejected & lost | strict 5s/no-audio/480p/24fps gates vs real-world files | server-side normalize: strip audio, trim to 5s, upscale, resample fps |
| 21 | Slow video loading | multi-MB originals, moov at end | feed-optimized rendition at upload (720p, CRF 26, +faststart) |
| 22 | Share sheet auto-scrolled up | focus effect re-ran on cover pick | `preventScroll` focus, split effects |
| 23 | Bottom nav slow to reappear | iOS throttles momentum scroll events | force-show at `scrollTop <= 0` |
| 24 | Posting without a rating | rating defaulted to 5 | explicit 1–10 required before Post enables |
| 25 | Caption copy not counted on iOS | `writeText` rejection swallowed | execCommand fallback + honest failure UI |
| 26 | Invites list slow/unmanageable | unbounded list | cursor pagination (10/page) + owner-scoped delete |
| 27 | iOS recorder stuck on "Finishing…" | MediaRecorder `onstop` never fires | requestData flush + watchdog + cancel button |
| 28 | iOS recordings unreadable | WebM/VPx claimed but broken on iOS | prefer `video/mp4` on iOS; reject <50KB blobs client-side |
| 29 | iOS recordings near-empty | no timeslice → no data until stop | `recorder.start(1000)` |
| 30 | iOS recordings ~4s, fail 5s gate | ~1s encoder warmup counted in window | 5s window armed on first data chunk |
| 31 | **Every posted review invisible in feed** | reviews created as UNDER_REVIEW; the only status transition was REJECT→HIDDEN; feed serves PUBLISHED only. Seed data (pre-PUBLISHED) masked it in dev/e2e | PASS→PUBLISHED transition in moderation queue + feed-cache clear; backfill SQL for stuck reviews; regression test added (an earlier test had even enshrined the buggy expectation) |

## 3. Architecture / Maintainability

- Monorepo: `apps/web` (React/Vite SPA), `apps/api` (Express/Prisma), `packages/database`, `packages/shared`.
- Upload pipeline (single pass in `routes/upload.ts`): validate → rectify (normalize) → feed-optimize → encrypt-at-rest + save → thumbnail → async moderation. Each stage independently testable (`videoValidator`, `localProcessor`, `storageCrypto`, `moderationQueue`).
- Media at rest: AES-256-GCM (`SRE1` header), transparent decrypt-on-serve with Range support; legacy plaintext compatible.
- Dev workflow: `scripts/start-app.sh` (one command: infra + HTTPS LAN stack + verification). Prod workflow: `scripts/deploy.sh` (pull → install → web build → docker stack → psql migrations → health check + auto-rollback).
- Test pyramid: API unit/integration (jest), web unit (vitest), E2E (Playwright local), production smoke (`e2e/prod-smoke.spec.ts`, runs against any URL).

## 4. Test Evidence

### Local

- `pnpm typecheck` — 4/4 packages clean.
- `pnpm --filter api test` — 82/82 pass.
- `pnpm --filter web test` — 12/12 pass.
- `pnpm test:e2e --workers=1` — (final clean-run results recorded at end of document).

### Production (https://168.144.121.93.sslip.io)

- Manual endpoint checks: `/api/health` 200, SPA 200, `/api/auth/providers` JSON, `/api/feed` 200, mp4 + mov uploads 201 (thumbnail generated, feed-optimized, encrypted at rest).
- `e2e/prod-smoke.spec.ts` — (results recorded at end of document).

## 5. Known Remaining Items

- **In-app camera recording on physical iPhone** — needs final on-device confirmation after the warmup-timing fix (cannot be emulated; Playwright cannot drive a real camera).
- **PR merge to `main`** — pending; deploy pipeline is branch-aware, so not a blocker, but `main` should become canonical.
- **Droplet size** — 1 GB + 2 GB swap works; resize to 2 GB RAM before real traffic.
- **Backup cron + restore rehearsal** — documented in `docs/PRELAUNCH.md`; cron line ready, rehearsal pending.
- **CI secrets for auto-deploy** — `SSH_HOST`/`SSH_USER`/`SSH_PRIVATE_KEY` not set; deploys are manual until then.
