# Silent Review Monorepo Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold a production-ready pnpm monorepo foundation for Silent Review with Vite + React web, Express API, shared Zod schemas, Prisma database package, PostgreSQL + Redis via Docker Compose, and a sub-5-minute onboarding flow.

**Architecture:** Four pnpm workspace packages (`apps/web`, `apps/api`, `packages/shared`, `packages/database`) with compiled shared/database packages consumed via `workspace:*`. Apps and packages extend a root `tsconfig.base.json`. Local infrastructure is provisioned by `docker-compose.yml` and wired together by root `package.json` scripts.

**Tech Stack:** pnpm workspaces, Vite 5, React 18, TypeScript 5, Tailwind CSS 3, Express 4, tsx, Zod, Prisma 5, PostgreSQL 15, Redis 7, concurrently.

## Global Constraints

- Use pnpm workspaces (no Turborepo initially).
- No cloud dependencies required for local development.
- All secrets must be injectable via environment variables.
- `packages/shared` and `packages/database` must emit compiled `dist/` output.
- Apps consume internal packages via `@silent-review/shared` and `@silent-review/database`.
- A new developer must be able to clone and run the app in under 5 minutes.

---

## File Structure

```
silent-review/
├── apps/
│   ├── api/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── env.ts
│   │       ├── index.ts
│   │       └── routes/
│   │           └── health.ts
│   └── web/
│       ├── index.html
│       ├── package.json
│       ├── postcss.config.js
│       ├── tailwind.config.js
│       ├── tsconfig.json
│       ├── tsconfig.node.json
│       ├── vite.config.ts
│       └── src/
│           ├── App.tsx
│           ├── index.css
│           └── main.tsx
├── packages/
│   ├── database/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── src/
│   │       ├── client.ts
│   │       └── index.ts
│   └── shared/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           ├── schemas/
│           │   ├── guess.ts
│           │   └── review.ts
│           └── types/
│               └── index.ts
├── docker-compose.yml
├── .env.example
├── .gitignore
├── package.json
├── pnpm-workspace.yaml
├── README.md
└── tsconfig.base.json
```

---

## Task 1: Root Project Scaffolding

**Files:**
- Create: `/Users/lukeouko/silent-review/package.json`
- Create: `/Users/lukeouko/silent-review/pnpm-workspace.yaml`
- Create: `/Users/lukeouko/silent-review/tsconfig.base.json`
- Create: `/Users/lukeouko/silent-review/.gitignore`

**Interfaces:**
- Produces: Root workspace configuration, shared TypeScript base, ignore rules.

- [ ] **Step 1: Create root `package.json`**

```json
{
  "name": "silent-review",
  "version": "0.0.1",
  "private": true,
  "description": "Silent Review — monorepo foundation",
  "packageManager": "pnpm@9.0.0",
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  },
  "scripts": {
    "dev": "concurrently \"pnpm dev:api\" \"pnpm dev:web\" --names api,web --prefix-colors blue,green",
    "dev:api": "pnpm --filter api dev",
    "dev:web": "pnpm --filter web dev",
    "dev:infra": "docker compose up -d",
    "build": "pnpm --filter shared build && pnpm --filter database build && pnpm --filter api build && pnpm --filter web build",
    "typecheck": "pnpm -r typecheck",
    "lint": "pnpm -r lint",
    "db:generate": "pnpm --filter database generate",
    "db:migrate": "pnpm --filter database migrate",
    "db:studio": "pnpm --filter database studio"
  },
  "devDependencies": {
    "concurrently": "^8.2.2",
    "typescript": "^5.4.5"
  }
}
```

- [ ] **Step 2: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 3: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  },
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 4: Create `.gitignore`**

```gitignore
# Dependencies
node_modules/
.pnpm-store/

# Build outputs
dist/
build/
*.tsbuildinfo

# Environment
.env
.env.local
.env.*.local

# Logs
*.log
logs/
.pnpm-debug.log*

# OS
.DS_Store
Thumbs.db

# IDE
.idea/
.vscode/
*.swp
*.swo

# Docker data
postgres_data/
```

- [ ] **Step 5: Verify root scaffolding**

Run:
```bash
cd /Users/lukeouko/silent-review
pnpm -v
```

Expected: pnpm version 9.x or later printed.

---

## Task 2: Shared Package

**Files:**
- Create: `/Users/lukeouko/silent-review/packages/shared/package.json`
- Create: `/Users/lukeouko/silent-review/packages/shared/tsconfig.json`
- Create: `/Users/lukeouko/silent-review/packages/shared/src/schemas/review.ts`
- Create: `/Users/lukeouko/silent-review/packages/shared/src/schemas/guess.ts`
- Create: `/Users/lukeouko/silent-review/packages/shared/src/types/index.ts`
- Create: `/Users/lukeouko/silent-review/packages/shared/src/index.ts`

**Interfaces:**
- Produces: `ReviewSchema`, `GuessSchema`, `CreateReviewInput`, `CreateGuessInput`, `Review`, `Guess`, `MIN_RATING`, `MAX_RATING`, `REVIEW_DURATION_SECONDS`.

- [ ] **Step 1: Create `packages/shared/package.json`**

```json
{
  "name": "@silent-review/shared",
  "version": "0.0.1",
  "private": true,
  "description": "Shared Zod schemas and TypeScript types",
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
    "lint": "echo 'No linter configured yet'"
  },
  "dependencies": {
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "typescript": "^5.4.5"
  }
}
```

- [ ] **Step 2: Create `packages/shared/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "module": "ESNext",
    "moduleResolution": "Bundler"
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules"]
}
```

- [ ] **Step 3: Create `src/schemas/review.ts`**

```typescript
import { z } from "zod";

export const MIN_RATING = 1;
export const MAX_RATING = 10;
export const REVIEW_DURATION_SECONDS = 5;

export const ReviewSchema = z.object({
  id: z.string().cuid(),
  authorId: z.string(),
  videoUrl: z.string().url(),
  rating: z.number().int().min(MIN_RATING).max(MAX_RATING),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateReviewInputSchema = ReviewSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
```

- [ ] **Step 4: Create `src/schemas/guess.ts`**

```typescript
import { z } from "zod";
import { MAX_RATING, MIN_RATING } from "./review.js";

export const GuessSchema = z.object({
  id: z.string().cuid(),
  reviewId: z.string().cuid(),
  userId: z.string(),
  guessedRating: z.number().int().min(MIN_RATING).max(MAX_RATING),
  createdAt: z.date(),
});

export const CreateGuessInputSchema = GuessSchema.omit({
  id: true,
  createdAt: true,
});
```

- [ ] **Step 5: Create `src/types/index.ts`****

```typescript
import { z } from "zod";
import { CreateGuessInputSchema, GuessSchema } from "../schemas/guess.js";
import { CreateReviewInputSchema, ReviewSchema } from "../schemas/review.js";

export type Review = z.infer<typeof ReviewSchema>;
export type CreateReviewInput = z.infer<typeof CreateReviewInputSchema>;
export type Guess = z.infer<typeof GuessSchema>;
export type CreateGuessInput = z.infer<typeof CreateGuessInputSchema>;
```

- [ ] **Step 6: Create `src/index.ts`**

```typescript
export * from "./schemas/guess.js";
export * from "./schemas/review.js";
export * from "./types/index.js";
```

- [ ] **Step 7: Install dependencies and build**

Run:
```bash
cd /Users/lukeouko/silent-review
pnpm install
pnpm --filter shared build
```

Expected: `packages/shared/dist/` is created with `index.js`, `index.d.ts`, and supporting files. No TypeScript errors.

---

## Task 3: Database Package

**Files:**
- Create: `/Users/lukeouko/silent-review/packages/database/package.json`
- Create: `/Users/lukeouko/silent-review/packages/database/tsconfig.json`
- Create: `/Users/lukeouko/silent-review/packages/database/prisma/schema.prisma`
- Create: `/Users/lukeouko/silent-review/packages/database/src/client.ts`
- Create: `/Users/lukeouko/silent-review/packages/database/src/index.ts`

**Interfaces:**
- Consumes: `@silent-review/shared` types/constants.
- Produces: `prisma` singleton, `checkDatabaseConnection()`.

- [ ] **Step 1: Create `packages/database/package.json`**

```json
{
  "name": "@silent-review/database",
  "version": "0.0.1",
  "private": true,
  "description": "Prisma client and connection utilities",
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
    "build": "prisma generate && tsc",
    "generate": "prisma generate",
    "migrate": "prisma migrate dev",
    "studio": "prisma studio",
    "typecheck": "tsc --noEmit",
    "lint": "echo 'No linter configured yet'"
  },
  "dependencies": {
    "@prisma/client": "^5.14.0",
    "@silent-review/shared": "workspace:*"
  },
  "devDependencies": {
    "prisma": "^5.14.0",
    "typescript": "^5.4.5"
  }
}
```

- [ ] **Step 2: Create `packages/database/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "module": "ESNext",
    "moduleResolution": "Bundler"
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules", "prisma"]
}
```

- [ ] **Step 3: Create `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Review {
  id        String   @id @default(cuid())
  authorId  String
  videoUrl  String
  rating    Int
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  guesses   Guess[]

  @@index([authorId])
  @@index([createdAt])
}

model Guess {
  id            String   @id @default(cuid())
  reviewId      String
  userId        String
  guessedRating Int
  createdAt     DateTime @default(now())
  review        Review   @relation(fields: [reviewId], references: [id], onDelete: Cascade)

  @@index([reviewId])
  @@index([userId])
}
```

- [ ] **Step 4: Create `src/client.ts`**

```typescript
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
});

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error("Database connection check failed:", error);
    return false;
  }
}
```

- [ ] **Step 5: Create `src/index.ts`**

```typescript
export { checkDatabaseConnection, prisma } from "./client.js";
export * from "@prisma/client";
```

- [ ] **Step 6: Install dependencies and generate client**

Run:
```bash
cd /Users/lukeouko/silent-review
pnpm install
pnpm --filter database generate
```

Expected: Prisma client is generated under `packages/database/node_modules/.prisma/client`.

- [ ] **Step 7: Build the package**

Run:
```bash
pnpm --filter shared build && pnpm --filter database build
```

Expected: `packages/database/dist/` is created with no TypeScript errors.

---

## Task 4: API Application

**Files:**
- Create: `/Users/lukeouko/silent-review/apps/api/package.json`
- Create: `/Users/lukeouko/silent-review/apps/api/tsconfig.json`
- Create: `/Users/lukeouko/silent-review/apps/api/src/env.ts`
- Create: `/Users/lukeouko/silent-review/apps/api/src/routes/health.ts`
- Create: `/Users/lukeouko/silent-review/apps/api/src/index.ts`

**Interfaces:**
- Consumes: `@silent-review/shared`, `@silent-review/database` (`checkDatabaseConnection`).
- Produces: Express server on `PORT` with `GET /health` route.

- [ ] **Step 1: Create `apps/api/package.json`**

```json
{
  "name": "@silent-review/api",
  "version": "0.0.1",
  "private": true,
  "description": "Silent Review API",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit",
    "lint": "echo 'No linter configured yet'"
  },
  "dependencies": {
    "@silent-review/database": "workspace:*",
    "@silent-review/shared": "workspace:*",
    "cors": "^2.8.5",
    "express": "^4.19.2",
    "helmet": "^7.1.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^20.12.12",
    "tsx": "^4.11.0",
    "typescript": "^5.4.5"
  }
}
```

- [ ] **Step 2: Create `apps/api/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "target": "ES2022",
    "jsx": "preserve"
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules"]
}
```

- [ ] **Step 3: Create `src/env.ts`**

```typescript
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().transform(Number).default("3001"),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
```

- [ ] **Step 4: Create `src/routes/health.ts`**

```typescript
import { Router } from "express";
import { checkDatabaseConnection } from "@silent-review/database";

export const healthRouter = Router();

healthRouter.get("/health", async (_req, res) => {
  const dbConnected = await checkDatabaseConnection();

  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? "ok" : "degraded",
    db: dbConnected ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});
```

- [ ] **Step 5: Create `src/index.ts`**

```typescript
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./env.js";
import { healthRouter } from "./routes/health.js";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use(healthRouter);

app.listen(env.PORT, () => {
  console.log(`🚀 API running at http://localhost:${env.PORT} in ${env.NODE_ENV} mode`);
});
```

- [ ] **Step 6: Install dependencies and build**

Run:
```bash
cd /Users/lukeouko/silent-review
pnpm install
pnpm --filter shared build
pnpm --filter database build
pnpm --filter api build
```

Expected: `apps/api/dist/` is created with no TypeScript errors.

- [ ] **Step 7: Verify health endpoint**

Run infrastructure first:
```bash
pnpm dev:infra
```

Wait a few seconds, then run the API temporarily:
```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/silent_review?schema=public" \
REDIS_URL="redis://localhost:6379" \
pnpm --filter api dev &
API_PID=$!
sleep 3
curl -s http://localhost:3001/health
kill $API_PID
```

Expected: JSON response with `status: "ok"` or `status: "degraded"` (before migrations the database may not exist yet, but connection should still work if the DB container is up).

---

## Task 5: Web Application

**Files:**
- Create: `/Users/lukeouko/silent-review/apps/web/package.json`
- Create: `/Users/lukeouko/silent-review/apps/web/tsconfig.json`
- Create: `/Users/lukeouko/silent-review/apps/web/tsconfig.node.json`
- Create: `/Users/lukeouko/silent-review/apps/web/vite.config.ts`
- Create: `/Users/lukeouko/silent-review/apps/web/index.html`
- Create: `/Users/lukeouko/silent-review/apps/web/tailwind.config.js`
- Create: `/Users/lukeouko/silent-review/apps/web/postcss.config.js`
- Create: `/Users/lukeouko/silent-review/apps/web/src/main.tsx`
- Create: `/Users/lukeouko/silent-review/apps/web/src/App.tsx`
- Create: `/Users/lukeouko/silent-review/apps/web/src/index.css`

**Interfaces:**
- Consumes: `@silent-review/shared` (types/constants only; no runtime usage needed for landing page).
- Produces: Vite dev server on port 5173 serving a landing page that calls `GET /health`.

- [ ] **Step 1: Create `apps/web/package.json`**

```json
{
  "name": "@silent-review/web",
  "version": "0.0.1",
  "private": true,
  "description": "Silent Review web app",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "lint": "echo 'No linter configured yet'"
  },
  "dependencies": {
    "@silent-review/shared": "workspace:*",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.3",
    "typescript": "^5.4.5",
    "vite": "^5.2.11"
  }
}
```

- [ ] **Step 2: Create `apps/web/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "target": "ES2020",
    "jsx": "react-jsx",
    "types": ["vite/client"]
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules"]
}
```

- [ ] **Step 3: Create `apps/web/tsconfig.node.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "target": "ES2022",
    "outDir": "./dist",
    "types": ["node"]
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 4: Create `apps/web/vite.config.ts`**

```typescript
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/health": {
        target: process.env.VITE_API_URL || "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **Step 5: Create `apps/web/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Silent Review</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Create `apps/web/tailwind.config.js`**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

- [ ] **Step 7: Create `apps/web/postcss.config.js`**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 8: Create `apps/web/src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-slate-950 text-slate-100 antialiased;
}
```

- [ ] **Step 9: Create `apps/web/src/main.tsx`**

```typescript
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.js";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 10: Create `apps/web/src/App.tsx`**

```typescript
import { useEffect, useState } from "react";

type HealthStatus = {
  status: string;
  db: string;
  timestamp: string;
};

function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/health")
      .then((res) => res.json())
      .then(setHealth)
      .catch(() => setError("Could not reach API"));
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <h1 className="mb-4 text-4xl font-bold tracking-tight">Silent Review</h1>
      <p className="mb-8 max-w-md text-lg text-slate-400">
        5-second silent video reviews. Guess the rating 1–10.
      </p>

      <div className="rounded-2xl bg-slate-900 px-8 py-6 shadow-lg">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
          API Status
        </h2>
        {error ? (
          <p className="text-red-400">{error}</p>
        ) : health ? (
          <div className="space-y-1">
            <p className="text-xl font-medium">
              Status: <span className={health.status === "ok" ? "text-green-400" : "text-amber-400"}>{health.status}</span>
            </p>
            <p className="text-slate-400">Database: {health.db}</p>
            <p className="text-xs text-slate-600">{health.timestamp}</p>
          </div>
        ) : (
          <p className="text-slate-500">Checking API…</p>
        )}
      </div>
    </main>
  );
}

export default App;
```

- [ ] **Step 11: Install dependencies and build**

Run:
```bash
cd /Users/lukeouko/silent-review
pnpm install
pnpm --filter shared build
pnpm --filter web build
```

Expected: `apps/web/dist/` is created with no TypeScript or Vite errors.

---

## Task 6: Docker Compose and Environment

**Files:**
- Create: `/Users/lukeouko/silent-review/docker-compose.yml`
- Create: `/Users/lukeouko/silent-review/.env.example`

**Interfaces:**
- Produces: Local PostgreSQL 15 and Redis 7 services, documented environment template.

- [ ] **Step 1: Create `docker-compose.yml`**

```yaml
services:
  postgres:
    image: postgres:15-alpine
    container_name: silent-review-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: silent_review
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d silent_review"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: silent-review-redis
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

- [ ] **Step 2: Create `.env.example`**

```bash
# App
NODE_ENV=development
PORT=3001
VITE_API_URL=http://localhost:3001

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/silent_review?schema=public

# Redis
REDIS_URL=redis://localhost:6379

# Secrets (not used by the foundation; reserved for sessions/auth)
SESSION_SECRET=change-me-in-production
```

- [ ] **Step 3: Start local infrastructure**

Run:
```bash
cd /Users/lukeouko/silent-review
pnpm dev:infra
```

Expected:
```
[+] Running 3/3
 ⠿ Container silent-review-redis   Started
 ⠿ Container silent-review-postgres Started
```

Verify:
```bash
docker ps --filter name=silent-review
```

Expected: Both `silent-review-postgres` and `silent-review-redis` containers are running.

---

## Task 7: README and Full Onboarding Verification

**Files:**
- Create: `/Users/lukeouko/silent-review/README.md`

**Interfaces:**
- Produces: Complete setup instructions. No downstream consumers.

- [ ] **Step 1: Create `README.md`**

```markdown
# Silent Review

A TikTok-style mobile web app where users create 5-second silent video reviews and others guess the rating 1–10.

## Tech Stack

- **Web:** Vite + React 18 + TypeScript + Tailwind CSS
- **API:** Express + TypeScript + tsx
- **Shared:** Zod schemas + TypeScript types
- **Database:** Prisma + PostgreSQL 15
- **Cache/Queue:** Redis 7
- **Monorepo:** pnpm workspaces

## Quick Start

> **Goal:** Clone and run in under 5 minutes.

### Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- [pnpm](https://pnpm.io/) >= 9
- [Docker Compose](https://docs.docker.com/compose/)

### 1. Clone and install

```bash
git clone <repo-url>
cd silent-review
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

The defaults in `.env.example` point to the local Docker services.

### 3. Start infrastructure

```bash
pnpm dev:infra
```

This starts PostgreSQL and Redis in the background.

### 4. Run database migrations

```bash
pnpm db:migrate
```

### 5. Start development servers

```bash
pnpm dev
```

- Web app: http://localhost:5173
- API: http://localhost:3001
- API health check: http://localhost:3001/health

## Useful Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Run API and web concurrently |
| `pnpm dev:api` | Run API only |
| `pnpm dev:web` | Run web only |
| `pnpm dev:infra` | Start PostgreSQL + Redis |
| `pnpm build` | Build all packages and apps |
| `pnpm typecheck` | Type-check all packages and apps |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:studio` | Open Prisma Studio |

## Project Structure

```
silent-review/
├── apps/
│   ├── api/              # Express API
│   └── web/              # Vite React web app
├── packages/
│   ├── shared/           # Zod schemas + TypeScript types
│   └── database/         # Prisma client + connection utilities
├── docker-compose.yml    # PostgreSQL + Redis
└── package.json          # Workspace scripts
```

## Environment Variables

All secrets are injectable via environment variables. See `.env.example` for the full list.

## License

[MIT](LICENSE)
```

- [ ] **Step 2: Run database migrations**

Ensure `.env` exists (copied from `.env.example`). Then run:

```bash
cd /Users/lukeouko/silent-review
pnpm db:migrate
```

Expected: Prisma creates the initial migration and applies `Review` and `Guess` tables.

- [ ] **Step 3: Run full dev stack and verify**

In one terminal:
```bash
cd /Users/lukeouko/silent-review
pnpm dev
```

Wait for both servers to start. In another terminal:

```bash
curl -s http://localhost:3001/health
```

Expected: JSON with `status: "ok"`, `db: "connected"`, and an ISO timestamp.

Open http://localhost:5173 in a browser. Expected: landing page shows "Silent Review" and API status "ok" / "connected".

- [ ] **Step 4: Stop infrastructure when done**

```bash
docker compose down
```

---

## Self-Review Checklist

- [ ] **Spec coverage:** Every deliverable from the design spec is represented by a task.
  - Root workspace config → Task 1
  - `packages/shared` → Task 2
  - `packages/database` → Task 3
  - `apps/api` → Task 4
  - `apps/web` → Task 5
  - `docker-compose.yml` + `.env.example` → Task 6
  - `README.md` + onboarding verification → Task 7
- [ ] **Placeholder scan:** No TBD, TODO, "implement later", or vague steps.
- [ ] **Type consistency:** Schema and type names (`ReviewSchema`, `GuessSchema`, `CreateReviewInput`, etc.) match across shared, database, and API usage.
- [ ] **Build order:** Root `build` script builds `shared` → `database` → `api` → `web` to satisfy workspace dependencies.
- [ ] **No cloud deps:** Only local Docker services are used.
