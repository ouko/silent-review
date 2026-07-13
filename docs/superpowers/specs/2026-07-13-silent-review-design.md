# Silent Review — Design Specification

## Overview

Silent Review is a mobile-first, TikTok-style social platform where users record **5-second silent video reviews** of products. Other users watch the review and **guess the rating (1–10)** before the actual rating is revealed. The core loop is: watch → guess → reveal → score.

This document describes the initial project scaffolding and foundational architecture. It intentionally omits production deployment, recommendation algorithms, and secondary OAuth providers (TikTok/Instagram), which are reserved for later phases.

---

## Goals

1. Provide a working local development environment with PostgreSQL, Redis, and hot-reload for both web and API.
2. Ship a monorepo layout using pnpm workspaces with three packages: `apps/web`, `apps/api`, and `packages/shared`.
3. Implement a type-safe database layer via Prisma in `packages/shared`.
4. Implement multi-platform authentication: Google, Apple, and email/password.
5. Implement direct-to-S3 video upload with presigned POST URLs and CloudFront playback.
6. Implement real-time guess/reveal via Socket.io with Redis adapter.
7. Provide a TikTok-style vertical feed UI in React 18 + Vite + Tailwind CSS.

---

## Non-Goals

1. TikTok and Instagram OAuth are **stubbed only** in this phase (config + placeholder strategy).
2. Push notifications, email verification, and password reset are **placeholder only**.
3. Recommendation/ranking algorithm: the feed is chronological.
4. Production deployment scripts, CI/CD, and infrastructure-as-code.
5. Native mobile apps (iOS/Android).
6. Payments, subscriptions, or admin dashboards.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Client                               │
│   apps/web  (Vite + React 18 + TypeScript + Tailwind)        │
│   • Record 5s video via MediaRecorder                        │
│   • Request presigned S3 URL from API                        │
│   • Upload video directly to S3                              │
│   • Socket.io client for live reveal                         │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTP / WebSocket
┌───────────────────────▼─────────────────────────────────────┐
│                         API                                  │
│   apps/api  (Express + TypeScript + Socket.io)               │
│   • REST routes: auth, reviews, guesses, upload, users       │
│   • Passport.js OAuth (Google, Apple, email)                 │
│   • JWT access token + httpOnly refresh cookie               │
│   • Prisma client from packages/shared                       │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                      Shared Package                          │
│   packages/shared                                            │
│   • Prisma schema (User, Review, Guess, Like, Follow, ...)   │
│   • Generated Prisma client exported as package              │
│   • Shared Zod schemas / TypeScript types                    │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌──────────┬────────────┴────────────┬─────────────────────────┐
│ Postgres │         Redis            │          S3 + CloudFront│
│   data   │  sessions / socket adapter│       video storage     │
└──────────┴─────────────────────────┴─────────────────────────┘
```

---

## Monorepo Structure

```
silent-review/
├── apps/
│   ├── web/
│   │   ├── src/
│   │   │   ├── components/        # Reusable UI components
│   │   │   ├── pages/             # Route-level pages
│   │   │   ├── hooks/             # Custom React hooks
│   │   │   ├── lib/               # API client, auth helpers
│   │   │   ├── stores/            # Zustand state stores
│   │   │   ├── App.tsx
│   │   │   ├── main.tsx
│   │   │   └── index.css
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tsconfig.node.json
│   │   ├── vite.config.ts
│   │   └── tailwind.config.ts
│   └── api/
│       ├── src/
│       │   ├── config/            # env validation, constants
│       │   ├── routes/            # Express routers
│       │   ├── middleware/        # auth, error, validation
│       │   ├── services/          # business logic
│       │   ├── socket/            # Socket.io handlers
│       │   ├── prisma/            # (re-exports from shared)
│       │   ├── app.ts             # Express app factory
│       │   └── server.ts          # bootstrap + http server
│       ├── package.json
│       ├── tsconfig.json
│       └── nodemon.json
├── packages/
│   └── shared/
│       ├── prisma/
│       │   └── schema.prisma
│       ├── src/
│       │   ├── index.ts
│       │   ├── schemas.ts         # Zod schemas
│       │   └── types.ts           # Shared TS types
│       ├── package.json
│       └── tsconfig.json
├── docker-compose.yml             # Postgres 15 + Redis 7
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.json
└── README.md
```

---

## Tech Stack

| Layer         | Technology                              |
|---------------|-----------------------------------------|
| Monorepo      | pnpm workspaces                         |
| Web           | React 18, TypeScript, Vite, Tailwind CSS|
| API           | Node.js, Express, TypeScript, Socket.io |
| Database      | PostgreSQL 15, Prisma ORM               |
| Cache/Realtime| Redis 7, `@socket.io/redis-adapter`     |
| Auth          | Passport.js, JWT, bcryptjs              |
| Video Storage | AWS S3, CloudFront                      |
| Validation    | Zod                                     |
| State         | Zustand                                 |
| HTTP Client   | axios                                   |
| Testing       | Vitest (unit), placeholder              |

---

## Data Model

### User
```prisma
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  username      String    @unique
  displayName   String?
  avatarUrl     String?
  passwordHash  String?   // null for OAuth-only users
  emailVerified Boolean   @default(false)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  reviews       Review[]
  guesses       Guess[]
  likes         Like[]
  comments      Comment[]
  followers     Follow[]  @relation("following")
  following     Follow[]  @relation("follower")
  refreshTokens RefreshToken[]
  oauthAccounts OAuthAccount[]
}
```

### OAuthAccount
```prisma
model OAuthAccount {
  id           String @id @default(uuid())
  provider     String // google, apple, tiktok, instagram
  providerId   String // sub/id from provider
  userId       String
  user         User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  accessToken  String?
  refreshToken String?
  expiresAt    DateTime?

  @@unique([provider, providerId])
}
```

### Review
```prisma
model Review {
  id            String   @id @default(uuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  videoUrl      String   // CloudFront URL
  thumbnailUrl  String?
  rating        Int      // 1-10
  caption       String?
  productTag    String?
  viewCount     Int      @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  guesses       Guess[]
  likes         Like[]
  comments      Comment[]
}
```

### Guess
```prisma
model Guess {
  id            String   @id @default(uuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  reviewId      String
  review        Review   @relation(fields: [reviewId], references: [id], onDelete: Cascade)
  guessedRating Int      // 1-10
  isCorrect     Boolean  @default(false)
  score         Int      // 0-100 based on distance
  createdAt     DateTime @default(now())

  @@unique([userId, reviewId])
}
```

### Like / Follow / Comment / RefreshToken
Standard social + session tables. See the actual Prisma schema file for full definitions.

---

## Authentication

### Providers
1. **Google OAuth 2.0** via `passport-google-oauth20`.
2. **Apple Sign In** via `passport-apple` (or `@passport-js/apple` if passport-apple is unmaintained).
3. **Email/Password** via local Passport strategy with bcryptjs.

### Token Strategy
- **Access token:** short-lived JWT (15 minutes), sent in `Authorization: Bearer <token>` header.
- **Refresh token:** long-lived opaque token (30 days) stored in `RefreshToken` table and delivered as an httpOnly cookie.
- Web client silently refreshes access tokens via `POST /api/auth/refresh`.

### OAuth Flow
1. User clicks provider button on `/login`.
2. Web navigates to `/api/auth/google` (or `/api/auth/apple`).
3. Provider redirects to `/api/auth/google/callback`.
4. API finds or creates `User` + `OAuthAccount`.
5. API issues JWT + refresh cookie and redirects to web dashboard (`/`).

### Email Flow
- `POST /api/auth/register` — create user, hash password.
- `POST /api/auth/login` — validate password, issue tokens.
- Email verification and password reset are **placeholders** (return 501 or no-op).

---

## Video Flow

1. Recorder page uses `MediaRecorder` to capture 5 seconds of muted video (webm/mp4).
2. Before upload, client calls `POST /api/upload/presigned` with file `type` and `size`.
3. API validates size ≤ 50 MB and MIME type starts with `video/`.
4. API generates a presigned S3 POST (or PUT) URL using AWS SDK v3 and returns:
   ```json
   {
     "url": "https://bucket.s3.region.amazonaws.com/",
     "fields": { "key": "reviews/<uuid>.mp4", "Policy": "...", ... },
     "reviewId": "<uuid>",
     "cloudFrontUrl": "https://d123.cloudfront.net/reviews/<uuid>.mp4"
   }
   ```
5. Client uploads directly to S3.
6. On success, client calls `POST /api/reviews` with `{ reviewId, videoUrl, rating, caption, productTag }`.
7. API creates the `Review` row and returns it.

### Constraints
- Max video length enforced client-side (5s timer) and server-side metadata check where possible.
- Videos are silent by convention; no audio processing in v1.

---

## Real-Time Flow

- Each review detail page joins a Socket.io room named `review:<reviewId>`.
- When the creator taps "Reveal", the client emits `review:reveal` with the `reviewId`.
- Server broadcasts `review:revealed` to the room containing:
  ```json
  {
    "reviewId": "...",
    "rating": 8,
    "totalGuesses": 42,
    "viewerResults": [ { "userId": "...", "guessedRating": 7, "score": 90 } ]
  }
  ```
- Server persists guesses and computes score: `score = max(0, 100 - 10 * |actual - guess|)`.
- Redis adapter ensures multi-instance consistency if the API is scaled later.

---

## API Route Summary

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET    | `/api/health` | No | Health check |
| POST   | `/api/auth/register` | No | Email registration |
| POST   | `/api/auth/login` | No | Email login |
| POST   | `/api/auth/refresh` | No (refresh cookie) | Refresh access token |
| POST   | `/api/auth/logout` | Yes | Revoke refresh token |
| GET    | `/api/auth/google` | No | Google OAuth start |
| GET    | `/api/auth/google/callback` | No | Google OAuth callback |
| GET    | `/api/auth/apple` | No | Apple OAuth start |
| POST   | `/api/auth/apple/callback` | No | Apple OAuth callback |
| GET    | `/api/auth/me` | Yes | Current user |
| GET    | `/api/feed` | Optional | Paginated review feed |
| POST   | `/api/reviews` | Yes | Create review |
| GET    | `/api/reviews/:id` | Optional | Review detail |
| POST   | `/api/reviews/:id/guess` | Yes | Submit guess |
| POST   | `/api/upload/presigned` | Yes | Get S3 presigned URL |
| GET    | `/api/users/:id` | Optional | Public profile |
| GET    | `/api/users/:id/reviews` | Optional | User's reviews |

---

## Web Page Summary

| Route | Purpose |
|-------|---------|
| `/` | Vertical feed: watch, guess, reveal |
| `/record` | Record and upload 5s review |
| `/review/:id` | Review detail + comments |
| `/profile/:id` | User profile and reviews |
| `/login` | Login / OAuth |
| `/register` | Email registration |

---

## Environment Variables

A root-level `.env.example` (and per-app copies where useful) will be generated with placeholders for:

**API (`apps/api`)**
- `PORT` (default `3001`)
- `NODE_ENV`
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`
- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- `S3_BUCKET_NAME`
- `CLOUDFRONT_DOMAIN`
- `WEB_APP_URL` (OAuth redirect target)

**Web (`apps/web`)**
- `VITE_API_URL` (backend base URL for the browser)

---

## Local Development

1. `pnpm install`
2. `docker compose up -d` (Postgres + Redis)
3. `pnpm db:migrate` (run Prisma migrations)
4. `pnpm db:seed` (optional seed data)
5. `pnpm dev` (starts web on `:5173` and api on `:3001` concurrently)

---

## Testing Strategy

- **Unit tests:** Vitest for shared schemas and utility functions.
- **API integration tests:** Placeholder setup using `supertest` against an in-memory/test Postgres instance.
- **Web component tests:** Placeholder using React Testing Library.

Full test coverage is not a goal for the initial scaffolding; the goal is to wire the test runners and demonstrate patterns.

---

## Success Criteria

1. `pnpm install` completes without errors.
2. `docker compose up -d` brings up Postgres and Redis.
3. `pnpm dev` starts both web and API with hot reload.
4. API responds to `/api/health`.
5. Prisma client generates and exports from `packages/shared`.
6. Web renders a login page and a feed placeholder.
7. `.env.example` documents all required configuration.
8. README contains setup instructions and project overview.

---

## Risks & Open Questions

1. **Apple OAuth:** Requires an Apple Developer account and private key. In v1, the route will exist but return 501 if credentials are missing.
2. **S3/CloudFront:** Video upload will be simulated or stubbed if AWS credentials are not configured; the presigned URL route will still generate a plausible URL shape.
3. **5-second enforcement:** Client-side timer is the primary enforcement; server will trust the metadata in v1.
4. **Mobile browser MediaRecorder support:** Some browsers prefer webm, others mp4. Web client will attempt mp4 and fall back to webm.
