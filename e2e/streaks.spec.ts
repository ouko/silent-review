import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { registerFreshUser, DEMO_PASSWORD } from "./helpers/auth";
import { startDailyDrop, submitDailyDropGuess } from "./helpers/dailydrop";
import { setUserStreakState } from "./helpers/db";

const DEFAULT_TIMEOUT = 15000;

async function apiLogin(
  context: BrowserContext,
  email: string,
  password: string
): Promise<string> {
  const res = await context.request.post("/api/auth/login", {
    data: { email, password },
    headers: { "Content-Type": "application/json" },
  });
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as { accessToken: string };
  return body.accessToken;
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function getMe(context: BrowserContext, token: string) {
  const res = await context.request.get("/api/auth/me", {
    headers: authHeaders(token),
  });
  expect(res.ok()).toBeTruthy();
  return res.json() as Promise<{ user: { id: string } }>;
}

async function getGamification(context: BrowserContext, token: string) {
  const res = await context.request.get("/api/gamification/me", {
    headers: authHeaders(token),
  });
  expect(res.ok()).toBeTruthy();
  return res.json() as Promise<{
    streakDays: number;
    longestStreak: number;
    freezeHeld: number;
    totalPoints: number;
  }>;
}

async function getNotifications(context: BrowserContext, token: string) {
  const res = await context.request.get("/api/notifications", {
    headers: authHeaders(token),
  });
  expect(res.ok()).toBeTruthy();
  return res.json() as Promise<{
    notifications: Array<{ type: string; title: string; body: string }>;
    unreadCount: number;
  }>;
}

test.describe.configure({ mode: "serial" });

test.describe("streaks", () => {
  // Daily Drop reveal and hydration can be slow under concurrent test load.
  test.setTimeout(120000);

  test.skip(
    ({ browserName }) => browserName === "webkit",
    "desktop WebKit emulator is too flaky for this flow"
  );

  test("completing the Daily Drop increments streakDays by 1", async ({ page }) => {
    const { token } = await registerFreshUser(page);
    const context = page.context();

    const before = await getGamification(context, token);
    expect(before.streakDays).toBe(0);

    await startDailyDrop(page);
    await submitDailyDropGuess(page, "5");

    await expect(async () => {
      const after = await getGamification(context, token);
      expect(after.streakDays).toBe(before.streakDays + 1);
    }).toPass({ timeout: DEFAULT_TIMEOUT });
  });

  test("streak UI shows current streak and any held freeze", async ({ page }) => {
    const { token } = await registerFreshUser(page);
    const userId = (await getMe(page.context(), token)).user.id;

    await startDailyDrop(page);
    await submitDailyDropGuess(page, "6");

    await page.goto("/play");

    // The streak card should reflect the current streak.
    const streakCard = page.locator("div").filter({ hasText: /day streak/i }).first();
    await expect(streakCard).toBeVisible({ timeout: DEFAULT_TIMEOUT });
    await expect(streakCard).toContainText("1");
    await expect(page.getByText("Longest:")).toBeVisible({ timeout: DEFAULT_TIMEOUT });

    // Fresh user has no freeze yet, so the protected badge should not render.
    await expect(page.getByText("Protected")).toBeHidden();

    // Simulate a freeze being held and verify the UI surfaces it.
    await setUserStreakState(userId, {
      streakDays: 5,
      freezeHeld: 1,
      lastFreezeEarnedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    });

    await page.reload();
    await expect(page.getByText("Protected")).toBeVisible({ timeout: DEFAULT_TIMEOUT });
  });

  test("streak-at-risk notification fires when a day is missed", async ({ page, browser }) => {
    const { token } = await registerFreshUser(page);
    const userId = (await getMe(page.context(), token)).user.id;

    // Simulate a user with an active streak who was last active two days ago
    // and has not completed today's Daily Drop.
    await setUserStreakState(userId, {
      streakDays: 3,
      lastActiveAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    });

    const adminContext = await browser.newContext();
    const adminToken = await apiLogin(
      adminContext,
      "demo@silentreview.app",
      DEMO_PASSWORD
    );

    const runRes = await adminContext.request.post("/api/admin/run-streak-at-risk", {
      headers: authHeaders(adminToken),
    });
    expect(runRes.ok()).toBeTruthy();
    const runBody = (await runRes.json()) as { notified: number };
    expect(runBody.notified).toBeGreaterThanOrEqual(1);

    const { notifications } = await getNotifications(page.context(), token);
    expect(notifications.some((n) => n.type === "STREAK_AT_RISK")).toBe(true);

    // The app polls for unread streak-at-risk notifications on navigation.
    await page.goto("/play");
    await expect(page.getByText("Streak at risk").first()).toBeVisible({
      timeout: DEFAULT_TIMEOUT,
    });

    await adminContext.close();
  });
});
