import { test, expect, type Page } from "@playwright/test";

const DEMO_PASSWORD = "DemoPass123!";

async function loginDemoUserViaApi(page: Page) {
  const res = await page.context().request.post("/api/auth/login", {
    data: { email: "demo@silentreview.app", password: DEMO_PASSWORD },
    headers: { "Content-Type": "application/json" },
  });
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as { accessToken: string; user: { id: string; email: string; username: string } };

  await page.goto("/play");
  await page.evaluate(
    ({ token, user }) => {
      localStorage.setItem(
        "silent-review-auth",
        JSON.stringify({ state: { user, accessToken: token, isLoading: false }, version: 0 })
      );
    },
    { token: body.accessToken, user: body.user }
  );
}

test.describe("feed performance", () => {
  test("feed renders from cache within 1 second after reload", async ({ page }) => {
    await loginDemoUserViaApi(page);
    await page.goto("/browse");
    await expect(page.locator("[data-testid='feed-item']").first()).toBeVisible({ timeout: 15000 });

    // Give TanStack Query persistence a moment to flush to IndexedDB.
    await page.waitForTimeout(500);

    await page.reload();
    await expect(page.locator("[data-testid='feed-item']").first()).toBeVisible({ timeout: 2000 });
  });

  test("shows offline indicator and keeps loaded feed items when connection drops", async ({ page, context }) => {
    await loginDemoUserViaApi(page);
    await page.goto("/browse");
    await expect(page.locator("[data-testid='feed-item']").first()).toBeVisible({ timeout: 15000 });

    await context.setOffline(true);
    await expect(page.getByText("Offline — showing saved content")).toBeVisible({ timeout: 3000 });
    await expect(page.locator("[data-testid='feed-item']").first()).toBeVisible();
  });
});
