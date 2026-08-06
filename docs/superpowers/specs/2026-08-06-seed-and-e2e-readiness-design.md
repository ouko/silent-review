# Seed-and-Sweep E2E Readiness Design

## Objective
Populate the local dev database with enough realistic dummy data that Silent Review looks alive, then run the full Playwright E2E suite across all projects, fix any remaining failures, and commit the result.

## Context
- The repo already contains a comprehensive seed script: `packages/database/prisma/seed.ts`.
- The seed produces 50 demo users, 1,000 products, 500+ published reviews, 20 moderation-queue reviews, ~10k guesses, ~3k likes, ~1.5k comments, follows, challenges, notifications, achievements, 120 days of Daily Drops, content-curation rows, and synthetic analytics events.
- 19 E2E spec files exist under `e2e/`, covering onboarding, auth, feed, guessing, sharing, challenges, daily drops, streaks, merchant/creator flows, admin workflows, notifications, result cards, video moderation, leaderboards, and the soft-launch journey.
- Recent fixes addressed iPhone Safari failures in `soft-launch-journey.spec.ts`, `challenges.spec.ts`, `prod-smoke.spec.ts`, `video-moderation.spec.ts`, and `helpers/auth.ts`. The soft-launch test is now flaky (passes on retry) with one remaining toggle-state issue.

## Approach
1. **Seed the dev database** using the existing `pnpm db:seed` command against the running Docker Compose PostgreSQL instance.
2. **Run the full E2E suite** with `pnpm test:e2e`. If wall-clock time is prohibitive, run per project (iPhone Safari first, then Mobile Chrome, then Desktop).
3. **Triage failures** into three buckets:
   - Flaky UI timing → add waits or stable locators.
   - Data-dependent assertions → adjust seed data or test selectors.
   - Real regressions → apply minimal code fixes in app/API.
4. **Re-run failing specs** individually until stable, then re-run the full suite.
5. **Commit** any test fixes and seed improvements.

## Commands
- Seed: `pnpm db:seed`
- Full suite: `pnpm test:e2e`
- Single project: `pnpm test:e2e --project="iPhone Safari"`
- Single spec: `pnpm test:e2e --project="iPhone Safari" e2e/soft-launch-journey.spec.ts`

## Success Criteria
- `pnpm db:seed` completes without errors.
- The app renders populated feeds, profiles, leaderboards, and Daily Drops after seeding.
- All E2E specs pass across configured projects, allowing for reasonable retries on flaky tests.
- Any fixes are committed with a clear message.

## Out of Scope
- Adding new features.
- Rewriting the seed script from scratch (extend only if needed).
- Deploying to production (only provide the deploy command after commit).
