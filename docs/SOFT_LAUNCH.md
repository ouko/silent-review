# Silent Review — Soft-Launch Checklist

Goal: release to a 5–10k user test cohort with trustworthy Phase 1 metrics
(D1/D7 retention, streak establishment, share rate, K-factor).

Time target: **< 1 hour** once the environment is provisioned.

---

## 1. Feature flags (5 min)

Run the audit script and confirm all Phase 2/3 flags are present and OFF:

```bash
pnpm audit:flags
```

Expected output:

```
✅ All Phase 2/3 feature flags exist and are disabled.
```

Flags that must be OFF before launch:

- `leagues`
- `rewarded_ads`
- `battle_pass`
- `streak_freeze_ad_reward`
- `streak_freeze_purchase`

If any flag is missing or enabled, fix `apps/api/src/features/features.seed.ts`,
re-seed the database, and re-run the audit.

---

## 2. Content queue filled 90 days (10 min)

Run the launch content curation script:

```bash
pnpm curate:launch
```

Verify:

- At least **250 curated reviews** exist across `CANDIDATE`, `APPROVED`, and
  `SCHEDULED`.
- At least **90 future Daily Drops** are scheduled.

Spot-check the admin Content Queue at `/admin/content-queue` (admin account
required). Confirm the top of the queue is diverse by product category and has
high guessability scores.

---

## 3. Analytics dashboard live (5 min)

Open `/admin/metrics` and confirm the following panels load in < 2 seconds:

- D1/D7/D30 retention cohort table
- K-factor panel
- Share rate panel
- Streak establishment funnel (open → first round → D7 return)

If the dashboard is slow, run the nightly rollup manually from the admin or
verify the `MetricSnapshot` table has rows for the last 7 days.

---

## 4. Backup verified (10 min)

Run a fresh database backup and confirm it completes:

```bash
./scripts/backup.sh
```

Check that the backup artifact exists and has a recent timestamp. Store a copy
off-server if not already automated.

---

## 5. Rollback tested (10 min)

Confirm the deploy script tags a rollback image:

```bash
ENV_FILE=.env.prod ./scripts/deploy.sh
```

Then test a quick rollback path:

```bash
docker tag silent-review/api:rollback silent-review/api:latest
docker compose -f docker-compose.prod.yml up -d api
```

Verify `/api/health` returns `200` after rollback.

---

## 6. Notification system end-to-end (10 min)

Run the soft-launch journey E2E test:

```bash
pnpm test:e2e e2e/soft-launch-journey.spec.ts
```

This validates:

- `daily-live` notification fires on a new Daily Drop.
- `streak-at-risk` fires for a user who skipped a day.
- `challenge-received` fires when a challenge is sent.
- `score-beaten` fires when the second player wins.
- All four toggles in `/notifications/settings` persist to the server.

---

## 7. Kill criteria printed

Print these numbers where the team can see them daily:

| Metric | Phase 1 target | Kill criteria |
|--------|----------------|---------------|
| D1 retention | ≥ 35% | — |
| D7 retention | ≥ 15% | **Stop if D7 < 15% after three loop iterations** |
| D30 retention | ≥ 8% | — |
| 7-day streak establishment | ≥ 20% of new users within 14 days | — |
| Share rate | ≥ 10% of daily players | — |
| K-factor | ≥ 0.3 after 6 months | **Stop if K < 0.3 after six months** |

After launch: **do not start Phase 2/3 features** until D1/D7 are read at day
14, streak establishment at day 21, and K-factor at day 30.

---

## Sign-off

- [ ] Feature flags audited and OFF
- [ ] Content queue ≥ 250 curated, Daily Drops ≥ 90 days
- [ ] Analytics dashboard loads and shows current data
- [ ] Backup completed and verified
- [ ] Rollback path tested
- [ ] Soft-launch E2E test passes
- [ ] Kill criteria posted in team channel / dashboard

Once all boxes are checked, the app is cleared for soft launch.
