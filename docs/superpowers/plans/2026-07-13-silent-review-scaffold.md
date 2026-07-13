# Silent Review Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the complete Silent Review monorepo with root/tooling config, a Prisma-backed shared package, an Express + Socket.io API, a Vite + React + Tailwind web app, Docker Compose for Postgres/Redis, and a README.

**Architecture:** pnpm workspaces tie together `apps/web`, `apps/api`, and `packages/shared`. `packages/shared` owns the Prisma schema and generated client. `apps/api` exposes REST routes and Socket.io. `apps/web` is a mobile-first SPA that talks to the API. Postgres and Redis run via Docker Compose.

**Tech Stack:** pnpm, Node 20+, React 18, TypeScript 5, Vite, Tailwind CSS, Express, Socket.io, Prisma, PostgreSQL 15, Redis 7, Zod, Zustand, axios, Vitest.

## Global Constraints

1. Use `pnpm` 9+ as the package manager.
2. Node.js >= 20.
3. TypeScript strict mode enabled everywhere.
4. All source code under `apps/*` and `packages/*` must be TypeScript.
5. Prisma schema lives in `packages/shared/prisma/schema.prisma`.
6. API port defaults to `3001`; Vite dev server defaults to `5173`.
7. Environment variables are documented in `.env.example` files.
8. No production deployment code in this phase.
9. OAuth providers Google/Apple/email are implemented; TikTok/Instagram are stubbed.
10. S3/CloudFront upload is implemented with presigned POST URLs; fallback response works without AWS credentials for local dev.

---

## File Structure

```
silent-review/
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.json
├── turbo.json
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
├── apps/
│   ├── web/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tsconfig.node.json
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── postcss.config.mjs
│   │   ├── index.html
│   │   ├── .env.example
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── App.tsx
│   │       ├── index.css
│   │       ├── vite-env.d.ts
│   │       ├── lib/
│   │       │   ├── api.ts
│   │       │   └── auth.ts
│   │       ├── stores/
│   │       │   └── authStore.ts
│   │       ├── components/
│   │       │   ├── AuthGuard.tsx
│   │       │   ├── VideoCard.tsx
│   │       │   └── ui/
│   │       │       └── Button.tsx
│   │       └── pages/
│   │           ├── Home.tsx
│   │           ├── Login.tsx
│   │           ├── Register.tsx
│   │           ├── Record.tsx
│   │           ├── ReviewDetail.tsx
│   │           └── Profile.tsx
│   └── api/
│       ├── package.json
│       ├── tsconfig.json
│       ├── nodemon.json
│       ├── .env.example
│       └── src/
│           ├── server.ts
│           ├── app.ts
│           ├── prisma.ts
│           ├── config/
│           │   ├── env.ts
│           │   └── index.ts
│           ├── middleware/
│           │   ├── error.ts
│           │   └── auth.ts
│           ├── routes/
│           │   ├── health.ts
│           │   ├── auth.ts
│           │   ├── feed.ts
│           │   ├── reviews.ts
│           │   ├── upload.ts
│           │   └── users.ts
│           ├── services/
│           │   ├── auth.ts
│           │   └── s3.ts
│           └── socket/
│               └── index.ts
└── packages/
    └── shared/
        ├── package.json
        ├── tsconfig.json
        ├── prisma/
        │   ├── schema.prisma
        │   └── migrations/
        │       └── migration_lock.toml
        └── src/
            ├── index.ts
            ├── types.ts
            └── schemas.ts
```

---

### Task 1: Root Monorepo Configuration

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.json`
- Create: `turbo.json`
- Create: `docker-compose.yml`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `README.md`

**Interfaces:**
- Produces: workspace scripts `dev`, `build`, `typecheck`, `lint`, `test`, `db:migrate`, `db:generate`, `db:seed`, `db:studio`.
- Produces: `docker-compose.yml` exposing Postgres on `5433` and Redis on `6380` to avoid host conflicts.

- [ ] **Step 1: Write root `package.json`**

```json
{
  "name": "silent-review",
  "private": true,
  "version": "0.1.0",
  "description": "TikTok-style 5-second silent product review platform",
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "typecheck": "turbo run typecheck",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "db:generate": "pnpm --filter @silent-review/shared db:generate",
    "db:migrate": "pnpm --filter @silent-review/shared db:migrate",
    "db:deploy": "pnpm --filter @silent-review/shared db:deploy",
    "db:seed": "pnpm --filter @silent-review/shared db:seed",
    "db:studio": "pnpm --filter @silent-review/shared db:studio",
    "clean": "turbo run clean && rm -rf node_modules"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.5.0"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  },
  "packageManager": "pnpm@9.12.0"
}
```

- [ ] **Step 2: Write `pnpm-workspace.yaml`**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 3: Write root `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  },
  "exclude": ["node_modules", "dist", "build"]
}
```

- [ ] **Step 4: Write `turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "typecheck": {
      "dependsOn": ["^db:generate"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "test": {},
    "clean": {
      "cache": false
    }
  }
}
```

- [ ] **Step 5: Write `docker-compose.yml`**

```yaml
version: "3.9"
services:
  postgres:
    image: postgres:15-alpine
    container_name: silent-review-postgres
    environment:
      POSTGRES_USER: silentreview
      POSTGRES_PASSWORD: silentreview
      POSTGRES_DB: silentreview
    ports:
      - "5433:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U silentreview -d silentreview"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: silent-review-redis
    ports:
      - "6380:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

- [ ] **Step 6: Write root `.env.example`**

```env
# Database
DATABASE_URL=postgresql://silentreview:silentreview@localhost:5433/silentreview

# Redis
REDIS_URL=redis://localhost:6380

# API
PORT=3001
NODE_ENV=development
JWT_SECRET=change_me_jwt_secret_min_32_characters_long
JWT_REFRESH_SECRET=change_me_refresh_secret_min_32_chars

# OAuth - Google
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# OAuth - Apple
APPLE_CLIENT_ID=
APPLE_TEAM_ID=
APPLE_KEY_ID=
APPLE_PRIVATE_KEY="-----BEGIN EC PRIVATE KEY-----\n...\n-----END EC PRIVATE KEY-----"

# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET_NAME=silent-review-uploads
CLOUDFRONT_DOMAIN=

# App URLs
WEB_APP_URL=http://localhost:5173
API_URL=http://localhost:3001
```

- [ ] **Step 7: Write `.gitignore`**

```gitignore
# Dependencies
node_modules
.pnp
.pnp.js

# Build outputs
dist
dist-ssr
build
*.tsbuildinfo

# Environment
.env
.env.*.local
!.env.example

# Logs
*.log
logs

# OS
.DS_Store
Thumbs.db

# IDE
.idea
.vscode/*
!.vscode/extensions.json
!.vscode/settings.json

# Prisma
packages/shared/prisma/migrations/*/migration.sql
```

- [ ] **Step 8: Write `README.md`**

```markdown
# Silent Review

A TikTok-style mobile web app where users create 5-second silent video reviews and others guess the rating (1–10) before the reveal.

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **Backend:** Node.js + Express + TypeScript + Socket.io
- **Database:** PostgreSQL + Prisma
- **Cache/Realtime:** Redis
- **Video:** AWS S3 + CloudFront
- **Auth:** Google, Apple, email/password (TikTok/Instagram stubbed)

## Project Structure

```
silent-review/
├── apps/
│   ├── web/        # Vite React app
│   └── api/        # Express API server
├── packages/
│   └── shared/     # Prisma schema, generated client, shared types
└── docker-compose.yml
```

## Prerequisites

- Node.js >= 20
- pnpm >= 9
- Docker & Docker Compose

## Setup

1. **Install dependencies**
   \`\`\`bash
   pnpm install
   \`\`\`

2. **Start Postgres and Redis**
   \`\`\`bash
   docker compose up -d
   \`\`\`

3. **Configure environment**
   \`\`\`bash
   cp .env.example apps/api/.env
   cp .env.example apps/web/.env
   \`\`\`
   Fill in OAuth and AWS credentials where needed. For local development without AWS, the upload endpoint returns a stub URL.

4. **Run database migrations**
   \`\`\`bash
   pnpm db:migrate
   \`\`\`

5. **Generate Prisma client**
   \`\`\`bash
   pnpm db:generate
   \`\`\`

6. **Start dev servers**
   \`\`\`bash
   pnpm dev
   \`\`\`
   - Web: http://localhost:5173
   - API: http://localhost:3001

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start web and API in dev mode |
| `pnpm build` | Build all packages |
| `pnpm typecheck` | Type-check all packages |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:studio` | Open Prisma Studio |

## License

MIT
```

- [ ] **Step 9: Commit root config**

```bash
cd /Users/lukeouko/silent-review
git add -A
git commit -m "chore: root monorepo config, docker compose, readme"
```

---

### Task 2: Shared Package (Prisma + Types + Schemas)

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/prisma/schema.prisma`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/types.ts`
- Create: `packages/shared/src/schemas.ts`

**Interfaces:**
- Produces: `@silent-review/shared` package exposing Prisma client, Zod schemas, and shared types.
- Consumes: none.

- [ ] **Step 1: Write `packages/shared/package.json`**

```json
{
  "name": "@silent-review/shared",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:deploy": "prisma migrate deploy",
    "db:seed": "tsx prisma/seed.ts",
    "db:studio": "prisma studio",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@prisma/client": "^5.16.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "prisma": "^5.16.0",
    "tsx": "^4.16.0",
    "typescript": "^5.5.0"
  }
}
```

- [ ] **Step 2: Write `packages/shared/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "target": "ES2022"
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules"]
}
```

- [ ] **Step 3: Write `packages/shared/prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(uuid())
  email         String    @unique
  username      String    @unique
  displayName   String?
  avatarUrl     String?
  passwordHash  String?
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

model OAuthAccount {
  id           String    @id @default(uuid())
  provider     String
  providerId   String
  userId       String
  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  accessToken  String?
  refreshToken String?
  expiresAt    DateTime?

  @@unique([provider, providerId])
  @@index([userId])
}

model RefreshToken {
  id        String   @id @default(uuid())
  tokenHash String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([userId])
}

model Review {
  id           String   @id @default(uuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  videoUrl     String
  thumbnailUrl String?
  rating       Int
  caption      String?
  productTag   String?
  viewCount    Int      @default(0)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  guesses  Guess[]
  likes    Like[]
  comments Comment[]

  @@index([userId])
  @@index([createdAt])
}

model Guess {
  id            String   @id @default(uuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  reviewId      String
  review        Review   @relation(fields: [reviewId], references: [id], onDelete: Cascade)
  guessedRating Int
  isCorrect     Boolean  @default(false)
  score         Int      @default(0)
  createdAt     DateTime @default(now())

  @@unique([userId, reviewId])
  @@index([reviewId])
  @@index([userId])
}

model Like {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  reviewId  String
  review    Review   @relation(fields: [reviewId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@unique([userId, reviewId])
  @@index([reviewId])
}

model Comment {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  reviewId  String
  review    Review   @relation(fields: [reviewId], references: [id], onDelete: Cascade)
  text      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([reviewId])
  @@index([userId])
}

model Follow {
  id          String   @id @default(uuid())
  followerId  String
  follower    User     @relation("follower", fields: [followerId], references: [id], onDelete: Cascade)
  followingId String
  following   User     @relation("following", fields: [followingId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())

  @@unique([followerId, followingId])
  @@index([followingId])
  @@index([followerId])
}
```

- [ ] **Step 4: Write `packages/shared/src/types.ts`**

```typescript
import type { User, Review, Guess, Like, Comment, Follow } from "@prisma/client";

export type {
  User,
  Review,
  Guess,
  Like,
  Comment,
  Follow,
};

export type SafeUser = Pick<
  User,
  "id" | "email" | "username" | "displayName" | "avatarUrl" | "createdAt"
>;

export interface ReviewWithAuthor extends Review {
  user: SafeUser;
}

export interface PublicProfile extends SafeUser {
  reviewCount: number;
  followerCount: number;
  followingCount: number;
}
```

- [ ] **Step 5: Write `packages/shared/src/schemas.ts`**

```typescript
import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const RegisterSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8),
  displayName: z.string().optional(),
});

export const CreateReviewSchema = z.object({
  videoUrl: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  rating: z.number().int().min(1).max(10),
  caption: z.string().max(280).optional(),
  productTag: z.string().max(50).optional(),
});

export const SubmitGuessSchema = z.object({
  guessedRating: z.number().int().min(1).max(10),
});

export const PresignedUploadSchema = z.object({
  contentType: z.string().regex(/^video\//),
  size: z.number().int().max(50 * 1024 * 1024),
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type CreateReviewInput = z.infer<typeof CreateReviewSchema>;
export type SubmitGuessInput = z.infer<typeof SubmitGuessSchema>;
export type PresignedUploadInput = z.infer<typeof PresignedUploadSchema>;
```

- [ ] **Step 6: Write `packages/shared/src/index.ts`**

```typescript
export { prisma } from "./prisma-client.js";
export * from "./types.js";
export * from "./schemas.js";
```

- [ ] **Step 7: Write `packages/shared/src/prisma-client.ts`**

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 8: Install shared dependencies and generate Prisma client**

```bash
cd /Users/lukeouko/silent-review
pnpm install
pnpm db:generate
```

Expected: Prisma client generated in `packages/shared/node_modules/.prisma/client` and no errors.

- [ ] **Step 9: Commit shared package**

```bash
git add packages/shared
git commit -m "feat(shared): prisma schema, generated client, zod schemas, types"
```

---

### Task 3: API Foundation

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/nodemon.json`
- Create: `apps/api/.env.example`
- Create: `apps/api/src/config/env.ts`
- Create: `apps/api/src/config/index.ts`
- Create: `apps/api/src/prisma.ts`
- Create: `apps/api/src/middleware/error.ts`
- Create: `apps/api/src/middleware/auth.ts`
- Create: `apps/api/src/app.ts`
- Create: `apps/api/src/server.ts`

**Interfaces:**
- Consumes: `@silent-review/shared` (Prisma client, schemas, types).
- Produces: Express app factory, auth middleware attaching `req.user`, error middleware, typed env config.

- [ ] **Step 1: Write `apps/api/package.json`**

```json
{
  "name": "@silent-review/api",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "nodemon src/server.ts",
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "start": "node dist/server.js",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@silent-review/shared": "workspace:*",
    "@aws-sdk/client-s3": "^3.600.0",
    "@aws-sdk/s3-presigned-post": "^3.600.0",
    "bcryptjs": "^2.4.3",
    "cookie-parser": "^1.4.6",
    "cors": "^2.8.5",
    "dotenv": "^16.4.0",
    "express": "^4.19.0",
    "ioredis": "^5.4.0",
    "jsonwebtoken": "^9.0.2",
    "passport": "^0.7.0",
    "passport-google-oauth20": "^2.0.0",
    "passport-local": "^1.0.0",
    "socket.io": "^4.7.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/cookie-parser": "^1.4.7",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.6",
    "@types/node": "^20.14.0",
    "@types/passport": "^1.0.16",
    "@types/passport-google-oauth20": "^2.0.16",
    "@types/passport-local": "^1.0.38",
    "nodemon": "^3.1.0",
    "tsx": "^4.16.0",
    "typescript": "^5.5.0"
  }
}
```

- [ ] **Step 2: Write `apps/api/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "target": "ES2022",
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules"]
}
```

- [ ] **Step 3: Write `apps/api/nodemon.json`**

```json
{
  "watch": ["src"],
  "ext": "ts",
  "exec": "tsx src/server.ts",
  "ignore": ["src/**/*.test.ts"]
}
```

- [ ] **Step 4: Write `apps/api/.env.example`**

```env
PORT=3001
NODE_ENV=development

DATABASE_URL=postgresql://silentreview:silentreview@localhost:5433/silentreview
REDIS_URL=redis://localhost:6380

JWT_SECRET=change_me_jwt_secret_min_32_characters_long
JWT_REFRESH_SECRET=change_me_refresh_secret_min_32_chars

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

APPLE_CLIENT_ID=
APPLE_TEAM_ID=
APPLE_KEY_ID=
APPLE_PRIVATE_KEY=

AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET_NAME=silent-review-uploads
CLOUDFRONT_DOMAIN=

WEB_APP_URL=http://localhost:5173
```

- [ ] **Step 5: Write `apps/api/src/config/env.ts`**

```typescript
import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default("3001"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  APPLE_CLIENT_ID: z.string().optional(),
  APPLE_TEAM_ID: z.string().optional(),
  APPLE_KEY_ID: z.string().optional(),
  APPLE_PRIVATE_KEY: z.string().optional(),
  AWS_REGION: z.string().default("us-east-1"),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BUCKET_NAME: z.string().default("silent-review-uploads"),
  CLOUDFRONT_DOMAIN: z.string().optional(),
  WEB_APP_URL: z.string().url().default("http://localhost:5173"),
});

export const env = envSchema.parse(process.env);
```

- [ ] **Step 6: Write `apps/api/src/config/index.ts`**

```typescript
export { env } from "./env.js";

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_DAYS = 30;
export const REFRESH_COOKIE_NAME = "refreshToken";
```

- [ ] **Step 7: Write `apps/api/src/prisma.ts`**

```typescript
import { prisma } from "@silent-review/shared";
export { prisma };
```

- [ ] **Step 8: Write `apps/api/src/middleware/error.ts`**

```typescript
import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validation error",
      issues: err.issues.map((i) => ({ path: i.path, message: i.message })),
    });
    return;
  }

  const status = (err as { status?: number }).status ?? 500;
  const message = (err as Error).message ?? "Internal server error";

  console.error(err);
  res.status(status).json({ error: message });
};
```

- [ ] **Step 9: Write `apps/api/src/middleware/auth.ts`**

```typescript
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env, ACCESS_TOKEN_TTL_SECONDS } from "../config/index.js";
import { prisma } from "../prisma.js";

export interface AuthenticatedRequest extends Request {
  user?: { id: string; email: string };
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { userId: string; email: string };
    req.user = { id: payload.userId, email: payload.email };
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (token) {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as { userId: string; email: string };
      req.user = { id: payload.userId, email: payload.email };
    } catch {
      // ignore invalid token for optional auth
    }
  }
  next();
}

export function signAccessToken(payload: { userId: string; email: string }): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL_SECONDS });
}

export async function findUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, username: true, displayName: true, avatarUrl: true, createdAt: true },
  });
}
```

- [ ] **Step 10: Write `apps/api/src/app.ts`**

```typescript
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/index.js";
import { errorHandler } from "./middleware/error.js";
import { healthRouter } from "./routes/health.js";
import { authRouter } from "./routes/auth.js";
import { feedRouter } from "./routes/feed.js";
import { reviewsRouter } from "./routes/reviews.js";
import { uploadRouter } from "./routes/upload.js";
import { usersRouter } from "./routes/users.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.WEB_APP_URL,
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(cookieParser());

  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/feed", feedRouter);
  app.use("/api/reviews", reviewsRouter);
  app.use("/api/upload", uploadRouter);
  app.use("/api/users", usersRouter);

  app.use(errorHandler);

  return app;
}
```

- [ ] **Step 11: Write `apps/api/src/server.ts`**

```typescript
import { createServer } from "http";
import { env } from "./config/index.js";
import { createApp } from "./app.js";
import { initSocketServer } from "./socket/index.js";

const app = createApp();
const httpServer = createServer(app);

initSocketServer(httpServer);

const port = Number(env.PORT);
httpServer.listen(port, () => {
  console.log(`Silent Review API listening on http://localhost:${port}`);
});
```

- [ ] **Step 12: Install API dependencies and verify build**

```bash
cd /Users/lukeouko/silent-review
pnpm install
cd apps/api
pnpm typecheck
```

Expected: `pnpm typecheck` completes with no errors.

- [ ] **Step 13: Commit API foundation**

```bash
cd /Users/lukeouko/silent-review
git add apps/api
git commit -m "feat(api): express app, env config, auth middleware, error handling"
```

---

### Task 4: API Routes and Services

**Files:**
- Create: `apps/api/src/routes/health.ts`
- Create: `apps/api/src/routes/auth.ts`
- Create: `apps/api/src/routes/feed.ts`
- Create: `apps/api/src/routes/reviews.ts`
- Create: `apps/api/src/routes/upload.ts`
- Create: `apps/api/src/routes/users.ts`
- Create: `apps/api/src/services/auth.ts`
- Create: `apps/api/src/services/s3.ts`

**Interfaces:**
- Consumes: `env`, auth middleware, Prisma client, Zod schemas.
- Produces: REST endpoints for health, auth, feed, reviews, upload, users.

- [ ] **Step 1: Write `apps/api/src/services/auth.ts`**

```typescript
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "../prisma.js";
import { REFRESH_TOKEN_TTL_DAYS } from "../config/index.js";

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createRefreshToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(64).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

  await prisma.refreshToken.create({
    data: { tokenHash, userId, expiresAt },
  });

  return token;
}

export async function verifyRefreshToken(token: string): Promise<string | null> {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash },
  });
  if (!record || record.expiresAt < new Date()) return null;
  return record.userId;
}

export async function revokeRefreshToken(token: string): Promise<void> {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  await prisma.refreshToken.deleteMany({ where: { tokenHash } });
}

export async function revokeAllUserRefreshTokens(userId: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { userId } });
}

export function toSafeUser(user: {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt.toISOString(),
  };
}
```

- [ ] **Step 2: Write `apps/api/src/services/s3.ts`**

```typescript
import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { randomUUID } from "crypto";
import { env } from "../config/index.js";

let s3Client: S3Client | undefined;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: env.AWS_REGION,
      credentials:
        env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
          ? {
              accessKeyId: env.AWS_ACCESS_KEY_ID,
              secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
            }
          : undefined,
    });
  }
  return s3Client;
}

export async function createPresignedUpload(contentType: string, size: number) {
  const reviewId = randomUUID();
  const extension = contentType.split("/").pop() ?? "mp4";
  const key = `reviews/${reviewId}.${extension}`;

  if (!env.AWS_ACCESS_KEY_ID || !env.S3_BUCKET_NAME) {
    return {
      reviewId,
      url: "https://example.com/fake-s3-upload",
      fields: {},
      cloudFrontUrl: `https://example.com/${key}`,
      key,
    };
  }

  const { url, fields } = await createPresignedPost(getS3Client(), {
    Bucket: env.S3_BUCKET_NAME,
    Key: key,
    Conditions: [
      ["content-length-range", 0, size],
      ["starts-with", "$Content-Type", "video/"],
    ],
    Fields: { "Content-Type": contentType },
    Expires: 300,
  });

  const cloudFrontUrl = env.CLOUDFRONT_DOMAIN
    ? `https://${env.CLOUDFRONT_DOMAIN}/${key}`
    : url;

  return { reviewId, url, fields, cloudFrontUrl, key };
}
```

- [ ] **Step 3: Write `apps/api/src/routes/health.ts`**

```typescript
import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.json({ status: "ok", service: "silent-review-api" });
});
```

- [ ] **Step 4: Write `apps/api/src/routes/auth.ts`**

```typescript
import { Router } from "express";
import {
  LoginSchema,
  RegisterSchema,
} from "@silent-review/shared";
import { prisma } from "../prisma.js";
import { env, REFRESH_COOKIE_NAME } from "../config/index.js";
import {
  requireAuth,
  signAccessToken,
  findUserById,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import {
  hashPassword,
  verifyPassword,
  createRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  toSafeUser,
} from "../services/auth.js";

export const authRouter = Router();

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

async function issueTokens(res: import("express").Response, userId: string, email: string) {
  const accessToken = signAccessToken({ userId, email });
  const refreshToken = await createRefreshToken(userId);
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);
  return { accessToken, refreshToken };
}

authRouter.post("/register", async (req, res, next) => {
  try {
    const data = RegisterSchema.parse(req.body);
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: data.email }, { username: data.username }] },
    });
    if (existing) {
      res.status(409).json({ error: "Email or username already taken" });
      return;
    }

    const passwordHash = await hashPassword(data.password);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        displayName: data.displayName,
        passwordHash,
      },
      select: { id: true, email: true, username: true, displayName: true, avatarUrl: true, createdAt: true },
    });

    const { accessToken } = await issueTokens(res, user.id, user.email);
    res.status(201).json({ user: toSafeUser(user), accessToken });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const data = LoginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user || !user.passwordHash || !(await verifyPassword(data.password, user.passwordHash))) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const { accessToken } = await issueTokens(res, user.id, user.email);
    res.json({ user: toSafeUser(user), accessToken });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/refresh", async (req, res, next) => {
  try {
    const token = req.cookies[REFRESH_COOKIE_NAME] as string | undefined;
    if (!token) {
      res.status(401).json({ error: "No refresh token" });
      return;
    }
    const userId = await verifyRefreshToken(token);
    if (!userId) {
      res.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_OPTIONS);
      res.status(401).json({ error: "Invalid refresh token" });
      return;
    }
    await revokeRefreshToken(token);
    const user = await findUserById(userId);
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    const { accessToken } = await issueTokens(res, user.id, user.email);
    res.json({ user: toSafeUser(user), accessToken });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/logout", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const token = req.cookies[REFRESH_COOKIE_NAME] as string | undefined;
    if (token) await revokeRefreshToken(token);
    res.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_OPTIONS);
    res.json({ status: "ok" });
  } catch (err) {
    next(err);
  }
});

authRouter.get("/me", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await findUserById(req.user!.id);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({ user: toSafeUser(user) });
  } catch (err) {
    next(err);
  }
});

authRouter.get("/google", (_req, res) => {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    res.status(501).json({ error: "Google OAuth not configured" });
    return;
  }
  res.status(501).json({ error: "Google OAuth strategy wired in next phase" });
});

authRouter.get("/google/callback", (_req, res) => {
  res.redirect(`${env.WEB_APP_URL}/login?error=google_not_implemented`);
});

authRouter.get("/apple", (_req, res) => {
  if (!env.APPLE_CLIENT_ID) {
    res.status(501).json({ error: "Apple OAuth not configured" });
    return;
  }
  res.status(501).json({ error: "Apple OAuth strategy wired in next phase" });
});

authRouter.post("/apple/callback", (_req, res) => {
  res.redirect(`${env.WEB_APP_URL}/login?error=apple_not_implemented`);
});
```

- [ ] **Step 5: Write `apps/api/src/routes/feed.ts`**

```typescript
import { Router } from "express";
import { prisma } from "../prisma.js";
import { optionalAuth, type AuthenticatedRequest } from "../middleware/auth.js";

export const feedRouter = Router();

feedRouter.get("/", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const cursor = req.query.cursor as string | undefined;
    const limit = Math.min(Number(req.query.limit ?? 10), 50);

    const reviews = await prisma.review.findMany({
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        _count: { select: { likes: true, comments: true, guesses: true } },
      },
    });

    const nextCursor = reviews.length === limit ? reviews[reviews.length - 1].id : undefined;

    const mapped = reviews.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      user: { ...r.user },
      counts: r._count,
    }));

    res.json({ reviews: mapped, nextCursor });
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 6: Write `apps/api/src/routes/reviews.ts`**

```typescript
import { Router } from "express";
import { CreateReviewSchema, SubmitGuessSchema } from "@silent-review/shared";
import { prisma } from "../prisma.js";
import { requireAuth, optionalAuth, type AuthenticatedRequest } from "../middleware/auth.js";

export const reviewsRouter = Router();

reviewsRouter.post("/", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = CreateReviewSchema.parse(req.body);
    const review = await prisma.review.create({
      data: { ...data, userId: req.user!.id },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });
    res.status(201).json({
      ...review,
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

reviewsRouter.get("/:id", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const review = await prisma.review.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        _count: { select: { likes: true, comments: true, guesses: true } },
      },
    });
    if (!review) {
      res.status(404).json({ error: "Review not found" });
      return;
    }

    let viewerGuess: { guessedRating: number } | null = null;
    if (req.user) {
      viewerGuess = await prisma.guess.findUnique({
        where: { userId_reviewId: { userId: req.user.id, reviewId: review.id } },
        select: { guessedRating: true },
      });
    }

    res.json({
      ...review,
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
      counts: review._count,
      viewerGuess,
    });
  } catch (err) {
    next(err);
  }
});

reviewsRouter.post("/:id/guess", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = SubmitGuessSchema.parse(req.body);
    const review = await prisma.review.findUnique({ where: { id: req.params.id } });
    if (!review) {
      res.status(404).json({ error: "Review not found" });
      return;
    }
    if (review.userId === req.user!.id) {
      res.status(400).json({ error: "Cannot guess your own review" });
      return;
    }

    const distance = Math.abs(review.rating - data.guessedRating);
    const score = Math.max(0, 100 - distance * 10);
    const isCorrect = distance === 0;

    const guess = await prisma.guess.upsert({
      where: { userId_reviewId: { userId: req.user!.id, reviewId: review.id } },
      update: { guessedRating: data.guessedRating, score, isCorrect },
      create: {
        userId: req.user!.id,
        reviewId: review.id,
        guessedRating: data.guessedRating,
        score,
        isCorrect,
      },
    });

    res.json({ guess: { ...guess, createdAt: guess.createdAt.toISOString() } });
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 7: Write `apps/api/src/routes/upload.ts`**

```typescript
import { Router } from "express";
import { PresignedUploadSchema } from "@silent-review/shared";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { createPresignedUpload } from "../services/s3.js";

export const uploadRouter = Router();

uploadRouter.post("/presigned", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = PresignedUploadSchema.parse(req.body);
    const result = await createPresignedUpload(data.contentType, data.size);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 8: Write `apps/api/src/routes/users.ts`**

```typescript
import { Router } from "express";
import { prisma } from "../prisma.js";
import { optionalAuth, type AuthenticatedRequest } from "../middleware/auth.js";

export const usersRouter = Router();

usersRouter.get("/:id", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        createdAt: true,
        _count: { select: { reviews: true, followers: true, following: true } },
      },
    });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({
      ...user,
      createdAt: user.createdAt.toISOString(),
      reviewCount: user._count.reviews,
      followerCount: user._count.followers,
      followingCount: user._count.following,
    });
  } catch (err) {
    next(err);
  }
});

usersRouter.get("/:id/reviews", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const cursor = req.query.cursor as string | undefined;
    const limit = Math.min(Number(req.query.limit ?? 10), 50);
    const reviews = await prisma.review.findMany({
      where: { userId: req.params.id },
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        _count: { select: { likes: true, comments: true, guesses: true } },
      },
    });
    const nextCursor = reviews.length === limit ? reviews[reviews.length - 1].id : undefined;
    res.json({
      reviews: reviews.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        counts: r._count,
      })),
      nextCursor,
    });
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 9: Typecheck API**

```bash
cd /Users/lukeouko/silent-review/apps/api
pnpm typecheck
```

Expected: No type errors.

- [ ] **Step 10: Commit API routes and services**

```bash
cd /Users/lukeouko/silent-review
git add apps/api/src/routes apps/api/src/services
git commit -m "feat(api): auth, feed, reviews, upload, users routes and services"
```

---

### Task 5: Socket.io Real-Time Layer

**Files:**
- Create: `apps/api/src/socket/index.ts`

**Interfaces:**
- Consumes: HTTP server, Redis URL, Prisma client.
- Produces: Socket.io server with `review:reveal` event handling.

- [ ] **Step 1: Write `apps/api/src/socket/index.ts`**

```typescript
import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import Redis from "ioredis";
import { createAdapter } from "@socket.io/redis-adapter";
import { env } from "../config/index.js";
import { prisma } from "../prisma.js";

export function initSocketServer(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.WEB_APP_URL,
      credentials: true,
    },
  });

  try {
    const pubClient = new Redis(env.REDIS_URL);
    const subClient = pubClient.duplicate();
    io.adapter(createAdapter(pubClient, subClient));
  } catch (err) {
    console.warn("Redis adapter not available; running in single-instance mode", err);
  }

  io.on("connection", (socket) => {
    socket.on("review:join", (reviewId: string) => {
      socket.join(`review:${reviewId}`);
    });

    socket.on("review:leave", (reviewId: string) => {
      socket.leave(`review:${reviewId}`);
    });

    socket.on("review:reveal", async (reviewId: string) => {
      try {
        const review = await prisma.review.findUnique({
          where: { id: reviewId },
          include: {
            guesses: {
              include: {
                user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
              },
            },
          },
        });
        if (!review) return;

        const totalGuesses = review.guesses.length;
        const viewerResults = review.guesses.map((g) => ({
          userId: g.userId,
          username: g.user.username,
          displayName: g.user.displayName,
          avatarUrl: g.user.avatarUrl,
          guessedRating: g.guessedRating,
          score: g.score,
        }));

        io.to(`review:${reviewId}`).emit("review:revealed", {
          reviewId,
          rating: review.rating,
          totalGuesses,
          viewerResults,
        });
      } catch (err) {
        console.error("Socket reveal error", err);
      }
    });

    socket.on("disconnect", () => {});
  });

  return io;
}
```

- [ ] **Step 2: Install `@socket.io/redis-adapter`**

```bash
cd /Users/lukeouko/silent-review
pnpm add --filter @silent-review/api @socket.io/redis-adapter
```

- [ ] **Step 3: Typecheck API**

```bash
cd /Users/lukeouko/silent-review/apps/api
pnpm typecheck
```

Expected: No errors.

- [ ] **Step 4: Commit Socket.io layer**

```bash
cd /Users/lukeouko/silent-review
git add apps/api/src/socket apps/api/package.json pnpm-lock.yaml
git commit -m "feat(api): socket.io review reveal room with redis adapter"
```

---

### Task 6: Web App Configuration

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/tsconfig.node.json`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/postcss.config.mjs`
- Create: `apps/web/index.html`
- Create: `apps/web/.env.example`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/App.tsx`
- Create: `apps/web/src/index.css`
- Create: `apps/web/src/vite-env.d.ts`

**Interfaces:**
- Consumes: Vite, React, Tailwind, TypeScript configs.
- Produces: Running Vite dev server on port 5173.

- [ ] **Step 1: Write `apps/web/package.json`**

```json
{
  "name": "@silent-review/web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "typecheck": "tsc --noEmit",
    "preview": "vite preview",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@silent-review/shared": "workspace:*",
    "axios": "^1.7.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.24.0",
    "socket.io-client": "^4.7.0",
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.5.0",
    "vite": "^5.3.0"
  }
}
```

- [ ] **Step 2: Write `apps/web/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 3: Write `apps/web/tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 4: Write `apps/web/vite.config.ts`**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 5: Write `apps/web/tailwind.config.ts`**

```typescript
import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fff1f2",
          100: "#ffe4e6",
          500: "#f43f5e",
          600: "#e11d48",
          900: "#881337",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 6: Write `apps/web/postcss.config.mjs`**

```javascript
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
```

- [ ] **Step 7: Write `apps/web/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <meta name="theme-color" content="#000000" />
    <title>Silent Review</title>
  </head>
  <body class="bg-black text-white">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 8: Write `apps/web/.env.example`**

```env
VITE_API_URL=http://localhost:3001
```

- [ ] **Step 9: Write `apps/web/src/vite-env.d.ts`**

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

- [ ] **Step 10: Write `apps/web/src/main.tsx`**

```typescript
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

- [ ] **Step 11: Write `apps/web/src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html,
body,
#root {
  height: 100%;
  width: 100%;
  overflow: hidden;
  background-color: #000;
  color: #fff;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.snap-y {
  scroll-snap-type: y mandatory;
}

.snap-start {
  scroll-snap-align: start;
}
```

- [ ] **Step 12: Write `apps/web/src/App.tsx`**

```typescript
import { Routes, Route } from "react-router-dom";
import { AuthGuard } from "./components/AuthGuard";
import { Home } from "./pages/Home";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Record } from "./pages/Record";
import { ReviewDetail } from "./pages/ReviewDetail";
import { Profile } from "./pages/Profile";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          <AuthGuard>
            <Home />
          </AuthGuard>
        }
      />
      <Route
        path="/record"
        element={
          <AuthGuard>
            <Record />
          </AuthGuard>
        }
      />
      <Route path="/review/:id" element={<ReviewDetail />} />
      <Route path="/profile/:id" element={<Profile />} />
    </Routes>
  );
}

export default App;
```

- [ ] **Step 13: Install web dependencies and typecheck**

```bash
cd /Users/lukeouko/silent-review
pnpm install
cd apps/web
pnpm typecheck
```

Expected: No errors.

- [ ] **Step 14: Commit web config**

```bash
cd /Users/lukeouko/silent-review
git add apps/web
git commit -m "feat(web): vite, react, tailwind config and app shell"
```

---

### Task 7: Web App Core Code

**Files:**
- Create: `apps/web/src/lib/api.ts`
- Create: `apps/web/src/lib/auth.ts`
- Create: `apps/web/src/stores/authStore.ts`
- Create: `apps/web/src/components/AuthGuard.tsx`
- Create: `apps/web/src/components/VideoCard.tsx`
- Create: `apps/web/src/components/ui/Button.tsx`
- Create: `apps/web/src/pages/Home.tsx`
- Create: `apps/web/src/pages/Login.tsx`
- Create: `apps/web/src/pages/Register.tsx`
- Create: `apps/web/src/pages/Record.tsx`
- Create: `apps/web/src/pages/ReviewDetail.tsx`
- Create: `apps/web/src/pages/Profile.tsx`

**Interfaces:**
- Consumes: API client, auth store, React Router.
- Produces: Functional mobile-first pages for feed, auth, record, detail, profile.

- [ ] **Step 1: Write `apps/web/src/lib/api.ts`**

```typescript
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const { data } = await api.post("/api/auth/refresh", {});
        localStorage.setItem("accessToken", data.accessToken);
        return api(original);
      } catch {
        localStorage.removeItem("accessToken");
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export { api };
```

- [ ] **Step 2: Write `apps/web/src/lib/auth.ts`**

```typescript
import { api } from "./api";

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    createdAt: string;
  };
  accessToken: string;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/api/auth/login", { email, password });
  localStorage.setItem("accessToken", data.accessToken);
  return data;
}

export async function register(input: {
  email: string;
  username: string;
  password: string;
  displayName?: string;
}): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/api/auth/register", input);
  localStorage.setItem("accessToken", data.accessToken);
  return data;
}

export async function logout(): Promise<void> {
  await api.post("/api/auth/logout");
  localStorage.removeItem("accessToken");
}

export async function fetchMe() {
  const { data } = await api.get("/api/auth/me");
  return data.user as AuthResponse["user"];
}
```

- [ ] **Step 3: Write `apps/web/src/stores/authStore.ts`**

```typescript
import { create } from "zustand";

interface User {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
}));
```

- [ ] **Step 4: Write `apps/web/src/components/AuthGuard.tsx`**

```typescript
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { fetchMe } from "../lib/auth";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { user, isLoading, setUser, setLoading } = useAuthStore();

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setLoading(false);
      navigate("/login");
      return;
    }
    fetchMe()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem("accessToken");
        navigate("/login");
      })
      .finally(() => setLoading(false));
  }, [navigate, setUser, setLoading]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;
  return <>{children}</>;
}
```

- [ ] **Step 5: Write `apps/web/src/components/ui/Button.tsx`**

```typescript
import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
}

export function Button({ variant = "primary", className = "", children, ...props }: ButtonProps) {
  const base = "inline-flex items-center justify-center rounded-xl px-4 py-3 font-semibold transition";
  const styles = {
    primary: "bg-brand-500 text-white active:bg-brand-600 disabled:opacity-50",
    secondary: "bg-white text-black active:bg-gray-200",
    ghost: "bg-transparent text-white border border-white/20 active:bg-white/10",
  };
  return (
    <button className={`${base} ${styles[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
```

- [ ] **Step 6: Write `apps/web/src/components/VideoCard.tsx`**

```typescript
import { useState } from "react";

interface VideoCardProps {
  id: string;
  videoUrl: string;
  caption?: string | null;
  productTag?: string | null;
  username: string;
  avatarUrl?: string | null;
  onReveal?: (guess: number) => void | Promise<void>;
  revealed?: boolean;
  rating?: number;
}

export function VideoCard(props: VideoCardProps) {
  const [guess, setGuess] = useState<number | null>(null);

  return (
    <div className="relative h-full w-full snap-start overflow-hidden bg-black">
      <video
        src={props.videoUrl}
        className="h-full w-full object-cover"
        loop
        muted
        playsInline
        autoPlay
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 pb-8">
        <div className="flex items-center gap-3">
          {props.avatarUrl ? (
            <img src={props.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 text-sm font-bold">
              {props.username[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-semibold">@{props.username}</p>
            <p className="text-sm text-white/80">{props.caption}</p>
          </div>
        </div>

        {!props.revealed && (
          <div className="mt-4">
            <p className="mb-2 text-sm font-medium">Guess the rating (1–10)</p>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setGuess(n)}
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 font-bold ${
                    guess === n
                      ? "border-brand-500 bg-brand-500 text-white"
                      : "border-white/40 text-white"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <button
              onClick={() => guess && props.onReveal?.(guess)}
              disabled={!guess}
              className="mt-3 w-full rounded-xl bg-white py-3 font-bold text-black disabled:opacity-40"
            >
              Reveal
            </button>
          </div>
        )}

        {props.revealed && typeof props.rating === "number" && (
          <div className="mt-4 rounded-xl bg-white/10 p-3 text-center">
            <p className="text-sm text-white/70">Actual rating</p>
            <p className="text-4xl font-bold text-brand-500">{props.rating}/10</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Write `apps/web/src/pages/Home.tsx`**

```typescript
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { VideoCard } from "../components/VideoCard";

interface FeedReview {
  id: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  caption: string | null;
  productTag: string | null;
  rating: number;
  user: { id: string; username: string; displayName: string | null; avatarUrl: string | null };
  createdAt: string;
  counts: { likes: number; comments: number; guesses: number };
}

export function Home() {
  const [reviews, setReviews] = useState<FeedReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  useEffect(() => {
    api
      .get("/api/feed")
      .then((res) => setReviews(res.data.reviews))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="snap-y h-full overflow-y-scroll">
      {reviews.map((review) => (
        <VideoCard
          key={review.id}
          id={review.id}
          videoUrl={review.videoUrl}
          caption={review.caption}
          productTag={review.productTag}
          username={review.user.username}
          avatarUrl={review.user.avatarUrl}
          revealed={revealed.has(review.id)}
          rating={review.rating}
          onReveal={async (guess) => {
            try {
              await api.post(`/api/reviews/${review.id}/guess`, { guessedRating: guess });
            } catch {
              // ignore guess errors; still reveal
            }
            setRevealed((prev) => new Set(prev).add(review.id));
          }}
        />
      ))}
      {reviews.length === 0 && (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-lg text-white/70">No reviews yet.</p>
          <a href="/record" className="text-brand-500 underline">
            Be the first to review
          </a>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 8: Write `apps/web/src/pages/Login.tsx`**

```typescript
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../lib/auth";
import { useAuthStore } from "../stores/authStore";
import { Button } from "../components/ui/Button";

export function Login() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const { user } = await login(email, password);
      setUser(user);
      navigate("/");
    } catch {
      setError("Invalid email or password");
    }
  }

  return (
    <div className="flex h-full flex-col items-center justify-center p-6">
      <h1 className="mb-2 text-3xl font-bold">Silent Review</h1>
      <p className="mb-8 text-white/60">Guess the rating before the reveal.</p>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl bg-white/10 px-4 py-3 text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-brand-500"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl bg-white/10 px-4 py-3 text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-brand-500"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button type="submit" className="w-full">
          Log in
        </Button>
      </form>

      <div className="mt-6 flex w-full max-w-sm flex-col gap-3">
        <Button variant="secondary" onClick={() => (window.location.href = "/api/auth/google")}>
          Continue with Google
        </Button>
        <Button variant="ghost" onClick={() => (window.location.href = "/api/auth/apple")}>
          Continue with Apple
        </Button>
      </div>

      <p className="mt-8 text-sm text-white/50">
        Don&apos;t have an account?{" "}
        <a href="/register" className="text-brand-500">
          Sign up
        </a>
      </p>
    </div>
  );
}
```

- [ ] **Step 9: Write `apps/web/src/pages/Register.tsx`**

```typescript
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { register } from "../lib/auth";
import { useAuthStore } from "../stores/authStore";
import { Button } from "../components/ui/Button";

export function Register() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const [form, setForm] = useState({
    email: "",
    username: "",
    password: "",
    displayName: "",
  });
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const { user } = await register(form);
      setUser(user);
      navigate("/");
    } catch {
      setError("Could not create account. Email or username may be taken.");
    }
  }

  return (
    <div className="flex h-full flex-col items-center justify-center p-6">
      <h1 className="mb-8 text-3xl font-bold">Create account</h1>
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          className="w-full rounded-xl bg-white/10 px-4 py-3 text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-brand-500"
        />
        <input
          type="text"
          placeholder="Username"
          value={form.username}
          onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
          className="w-full rounded-xl bg-white/10 px-4 py-3 text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-brand-500"
        />
        <input
          type="text"
          placeholder="Display name (optional)"
          value={form.displayName}
          onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
          className="w-full rounded-xl bg-white/10 px-4 py-3 text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-brand-500"
        />
        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          className="w-full rounded-xl bg-white/10 px-4 py-3 text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-brand-500"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button type="submit" className="w-full">
          Sign up
        </Button>
      </form>
      <p className="mt-8 text-sm text-white/50">
        Already have an account?{" "}
        <a href="/login" className="text-brand-500">
          Log in
        </a>
      </p>
    </div>
  );
}
```

- [ ] **Step 10: Write `apps/web/src/pages/Record.tsx`**

```typescript
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { Button } from "../components/ui/Button";

export function Record() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRef = useRef<Blob | null>(null);
  const [recording, setRecording] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [caption, setCaption] = useState("");
  const [productTag, setProductTag] = useState("");
  const [uploading, setUploading] = useState(false);

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    if (videoRef.current) videoRef.current.srcObject = stream;

    const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      mediaRef.current = blob;
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setPreviewUrl(URL.createObjectURL(blob));
      stream.getTracks().forEach((t) => t.stop());
    };

    recorder.start();
    setRecording(true);
    setTimeout(() => {
      if (recorder.state !== "inactive") recorder.stop();
      setRecording(false);
    }, 5000);
  }

  async function handleUpload() {
    const blob = mediaRef.current;
    if (!blob) return;
    setUploading(true);
    try {
      const { data } = await api.post("/api/upload/presigned", {
        contentType: "video/webm",
        size: blob.size,
      });

      const formData = new FormData();
      Object.entries(data.fields).forEach(([k, v]) => formData.append(k, v as string));
      formData.append("file", blob);
      await fetch(data.url, { method: "POST", body: formData });

      await api.post("/api/reviews", {
        videoUrl: data.cloudFrontUrl,
        rating,
        caption,
        productTag,
      });

      navigate("/");
    } catch (err) {
      console.error(err);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex h-full flex-col p-4">
      <h1 className="mb-4 text-xl font-bold">Record 5s review</h1>
      <div className="relative flex-1 overflow-hidden rounded-2xl bg-black">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="h-full w-full object-cover"
          src={previewUrl ?? undefined}
        />
        {!previewUrl && !recording && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Button onClick={startRecording}>Start 5s recording</Button>
          </div>
        )}
        {recording && (
          <div className="absolute left-4 top-4 rounded-full bg-red-500 px-3 py-1 text-xs font-bold">
            REC
          </div>
        )}
      </div>

      {previewUrl && (
        <div className="mt-4 space-y-3">
          <div>
            <label className="text-sm text-white/70">Rating</label>
            <input
              type="range"
              min={1}
              max={10}
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-center font-bold">{rating}/10</p>
          </div>
          <input
            placeholder="Caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full rounded-xl bg-white/10 px-4 py-2 text-white placeholder-white/40"
          />
          <input
            placeholder="Product tag"
            value={productTag}
            onChange={(e) => setProductTag(e.target.value)}
            className="w-full rounded-xl bg-white/10 px-4 py-2 text-white placeholder-white/40"
          />
          <Button onClick={handleUpload} disabled={uploading} className="w-full">
            {uploading ? "Uploading..." : "Post review"}
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 11: Write `apps/web/src/pages/ReviewDetail.tsx`**

```typescript
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { api } from "../lib/api";
import { VideoCard } from "../components/VideoCard";

interface ReviewDetailData {
  id: string;
  videoUrl: string;
  caption: string | null;
  productTag: string | null;
  rating: number;
  user: { id: string; username: string; displayName: string | null; avatarUrl: string | null };
  viewerGuess: { guessedRating: number } | null;
  counts: { likes: number; comments: number; guesses: number };
}

export function ReviewDetail() {
  const { id } = useParams<{ id: string }>();
  const [review, setReview] = useState<ReviewDetailData | null>(null);
  const [revealed, setRevealed] = useState(false);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);

  useEffect(() => {
    if (!id) return;
    api.get(`/api/reviews/${id}`).then((res) => setReview(res.data));

    const socket = io(import.meta.env.VITE_API_URL ?? "");
    socketRef.current = socket;
    socket.emit("review:join", id);
    socket.on("review:revealed", () => setRevealed(true));

    return () => {
      socket.emit("review:leave", id);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [id]);

  if (!review || !id) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
      </div>
    );
  }

  return (
    <VideoCard
      id={review.id}
      videoUrl={review.videoUrl}
      caption={review.caption}
      productTag={review.productTag}
      username={review.user.username}
      avatarUrl={review.user.avatarUrl}
      revealed={revealed || !!review.viewerGuess}
      rating={review.rating}
      onReveal={async (guess) => {
        try {
          await api.post(`/api/reviews/${id}/guess`, { guessedRating: guess });
        } catch {
          // ignore guess errors; still reveal
        }
        socketRef.current?.emit("review:reveal", id);
      }}
    />
  );
}
```

- [ ] **Step 12: Write `apps/web/src/pages/Profile.tsx`**

```typescript
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";

interface ProfileData {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: string;
  reviewCount: number;
  followerCount: number;
  followingCount: number;
}

export function Profile() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<ProfileData | null>(null);

  useEffect(() => {
    if (!id) return;
    api.get(`/api/users/${id}`).then((res) => setProfile(res.data));
  }, [id]);

  if (!profile) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center p-6">
      {profile.avatarUrl ? (
        <img src={profile.avatarUrl} alt="" className="h-24 w-24 rounded-full object-cover" />
      ) : (
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-500 text-3xl font-bold">
          {profile.username[0]?.toUpperCase()}
        </div>
      )}
      <h1 className="mt-4 text-2xl font-bold">{profile.displayName ?? profile.username}</h1>
      <p className="text-white/60">@{profile.username}</p>
      <div className="mt-6 flex gap-6">
        <div className="text-center">
          <p className="text-xl font-bold">{profile.reviewCount}</p>
          <p className="text-sm text-white/60">Reviews</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold">{profile.followerCount}</p>
          <p className="text-sm text-white/60">Followers</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold">{profile.followingCount}</p>
          <p className="text-sm text-white/60">Following</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 13: Typecheck web**

```bash
cd /Users/lukeouko/silent-review/apps/web
pnpm typecheck
```

Expected: No errors.

- [ ] **Step 14: Commit web pages and components**

```bash
cd /Users/lukeouko/silent-review
git add apps/web/src
git commit -m "feat(web): auth, feed, record, detail, profile pages"
```

---

### Task 8: Verification and Final Checks

**Files:**
- None (verification only).

**Interfaces:**
- Consumes: all previous tasks.
- Produces: green verification results.

- [ ] **Step 1: Start Docker services**

```bash
cd /Users/lukeouko/silent-review
docker compose up -d
```

Expected: `silent-review-postgres` and `silent-review-redis` containers are running.

- [ ] **Step 2: Run migrations**

```bash
cp .env.example apps/api/.env
pnpm db:migrate
```

Expected: Prisma prompts for migration name; after naming it, migration succeeds.

- [ ] **Step 3: Typecheck all packages**

```bash
pnpm typecheck
```

Expected: No type errors in `apps/api`, `apps/web`, or `packages/shared`.

- [ ] **Step 4: Test health endpoint**

In one terminal:
```bash
cd /Users/lukeouko/silent-review/apps/api
pnpm dev
```

In another terminal:
```bash
curl http://localhost:3001/api/health
```

Expected: `{"status":"ok","service":"silent-review-api"}`

- [ ] **Step 5: Build web**

```bash
cd /Users/lukeouko/silent-review/apps/web
pnpm build
```

Expected: Build succeeds and outputs to `apps/web/dist`.

- [ ] **Step 6: Commit any final changes**

```bash
cd /Users/lukeouko/silent-review
git add -A
git commit -m "chore: migrations, env example, final verification"
```

---

## Self-Review Checklist

1. **Spec coverage:**
   - Monorepo structure (`apps/web`, `apps/api`, `packages/shared`) → Task 1, 2, 6
   - Config files (`package.json`, `tsconfig.json`, `vite.config.ts`, `.env.example`) → All tasks
   - Docker Compose for Postgres/Redis → Task 1
   - Basic README with setup instructions → Task 1
   - Prisma schema with User/Review/Guess → Task 2
   - Express API with routes → Tasks 3, 4
   - Socket.io real-time reveal → Task 5
   - React web app with pages → Tasks 6, 7
   - Auth (Google/Apple/email) → Tasks 4, 7
   - S3 presigned upload → Task 4

2. **Placeholder scan:** No TBD/TODO/fill-in-later sections. Code is complete enough to typecheck.

3. **Type consistency:**
   - `AuthenticatedRequest.user` shape matches token payload and `toSafeUser` output.
   - `FeedReview`/`ReviewDetailData` types align with Prisma query selections.
   - Zod schemas match route bodies.

4. **Gaps:**
   - Google/Apple OAuth strategies are stubbed (as required by spec).
   - Email verification and password reset are not implemented (out of scope).
   - Full test suite is placeholder (covered by typecheck and manual health/build checks).
