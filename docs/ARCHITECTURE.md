# Architecture

Silent Review is a TikTok-style mobile web app built as a pnpm monorepo. This document explains the high-level design and key decisions.

## Overview

Users create 5-second silent video reviews of products. Other users guess the 1–10 rating before the reveal. The app is designed to feel like a game, with streaks, achievements, leaderboards, and shareable exports.

## Monorepo Layout

```
silent-review/
├── apps/
│   ├── api/              # Express API (TypeScript ESM)
│   └── web/              # Vite + React web app
├── packages/
│   ├── shared/           # Zod schemas + shared TypeScript types
│   └── database/         # Prisma schema + client
├── e2e/                  # Playwright end-to-end tests
├── docs/                 # Documentation
├── nginx/                # Production reverse proxy config
└── scripts/              # Automation scripts
```

## Technology Choices

| Layer | Technology | Reason |
|-------|------------|--------|
| Frontend | Vite + React 18 | Fast dev experience, modern build |
| Styling | Tailwind CSS | Utility-first, rapid UI iteration |
| State | Zustand + React Query | Minimal boilerplate, server-state caching |
| Backend | Express + TypeScript ESM | Familiar, flexible, type-safe |
| Database | PostgreSQL 15 + Prisma | Reliable relational store, generated client |
| Cache | Redis 7 | Socket.io adapter, sessions, rate limits |
| Realtime | Socket.io | Live guesses and presence |
| Tests | Jest (API), Vitest (web), Playwright (E2E) | Layer-appropriate tooling |
| Deploy | Docker Compose + GitHub Actions | Simple, cost-effective, automated |

## Data Flow

1. Users record/upload a 5-second video review via the web app.
2. The API stores the video (local disk for dev, S3 for production) and creates a `Review` record.
3. The feed algorithm scores reviews by recency, engagement, interests, and following.
4. Users guess ratings; the API awards points and updates streaks/achievements.
5. Reveal shows the actual rating, guess distribution, and share options.

## Key Decisions

- **ESM everywhere:** Server uses native ESM with `.js` imports, compiled by `tsc`.
- **Workspace packages:** Shared types and database client are reused across apps.
- **Feature flags in DB:** Flags can be toggled without redeploying code.
- **Regional middleware:** Geo-compliance hooks are built in for GDPR/CCPA.
- **Offline PWA:** Service worker caches the shell and static assets.
- **Deployment simplicity:** Docker Compose on a single VPS keeps costs under $100/month at 10K users.

## Scaling Considerations

- The feed algorithm runs in memory; at very large scale, consider materialized views or a dedicated scoring service.
- Uploaded videos currently serve through the API/nginx; for scale, move to a CDN.
- WebSocket presence can be sharded by Redis as user count grows.
