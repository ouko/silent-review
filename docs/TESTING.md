# Testing Guide

Silent Review uses a layered testing strategy: unit tests, integration tests, and end-to-end tests.

## Test Suites

| Suite | Tool | Location | Command |
|-------|------|----------|---------|
| API unit/integration | Jest + ts-jest | `apps/api/src/**/*.test.ts` | `pnpm --filter api test` |
| Web component | Vitest | `apps/web/src/**/*.test.tsx` | `pnpm --filter web test` |
| E2E | Playwright | `e2e/*.spec.ts` | `pnpm test:e2e` |

## Running Tests

### All unit/integration tests

```bash
pnpm --filter api test
pnpm --filter web test
```

### With coverage

```bash
pnpm --filter api test:coverage
```

### E2E tests

E2E tests require the full dev stack running:

```bash
pnpm start:dev
# In another terminal:
pnpm test:e2e
```

### Typecheck and build

```bash
pnpm typecheck
pnpm build
```

## Writing API Tests

API tests use Jest with ESM and mock Prisma via `jest.unstable_mockModule`.

Example:

```ts
import { jest } from "@jest/globals";

const mockPrisma: any = {
  review: { findFirst: jest.fn(), create: jest.fn() },
};

jest.unstable_mockModule("../prisma.js", () => ({
  prisma: mockPrisma,
}));

const { createReview } = await import("./reviews.service.js");

describe("createReview", () => {
  it("creates a review", async () => {
    mockPrisma.review.findFirst.mockResolvedValue(null);
    mockPrisma.review.create.mockResolvedValue({ id: "r1" });
    const result = await createReview("u1", { /* input */ });
    expect(result.id).toBe("r1");
  });
});
```

## Writing Web Tests

Web tests use Vitest, jsdom, and React Testing Library.

Example:

```tsx
import { render, screen } from "@testing-library/react";
import { PointsDisplay } from "../PointsDisplay";

describe("PointsDisplay", () => {
  it("renders formatted points", () => {
    render(<PointsDisplay points={1234} />);
    expect(screen.getByText("1,234")).toBeInTheDocument();
  });
});
```

## Writing E2E Tests

E2E tests use Playwright with mobile viewports (Pixel 5 and iPhone 14). Use demo credentials when testing authenticated flows:

```ts
await page.goto("/login");
await page.getByPlaceholder("Email").fill("demo@silentreview.app");
await page.getByPlaceholder("Password").fill("DemoPass123!");
await page.getByRole("button", { name: /log in with email/i }).click();
```

The seeded demo accounts are:

| Email | Username | Password |
|-------|----------|----------|
| `demo@silentreview.app` | `demouser` | `DemoPass123!` |
| `alice@silentreview.app` | `alice` | `DemoPass123!` |
| `bob@silentreview.app` | `bob` | `DemoPass123!` |

`e2e/multi-user-workflows.spec.ts` exercises these accounts end-to-end: each logs in, sees the newest reviews first with visible product tags, likes/comments on another user's review, and verifies the notification appears for the review owner. It also covers the follow → Following-feed workflow.

## CI

Tests run on every push to `main` and every pull request via `.github/workflows/test.yml`. The workflow runs `pnpm typecheck`, `pnpm build`, unit tests for the API and web apps, and the full Playwright E2E suite against a seeded database.
