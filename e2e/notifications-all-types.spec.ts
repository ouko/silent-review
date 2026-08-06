import { test, expect, type BrowserContext } from "@playwright/test";
import { registerFreshUser, DEMO_PASSWORD } from "./helpers/auth";
import { loginAsAdmin } from "./helpers/admin";

const DEFAULT_TIMEOUT = 15000;

async function apiLogin(context: BrowserContext, email: string, password: string) {
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

async function me(context: BrowserContext, token: string) {
  const res = await context.request.get("/api/auth/me", { headers: authHeaders(token) });
  expect(res.ok()).toBeTruthy();
  return res.json() as Promise<{
    user: { id: string; email: string; username: string };
  }>;
}

async function gamificationMe(context: BrowserContext, token: string) {
  const res = await context.request.get("/api/gamification/me", { headers: authHeaders(token) });
  expect(res.ok()).toBeTruthy();
  return res.json() as Promise<{ streakDays: number }>;
}

async function setActive(context: BrowserContext, token: string) {
  const res = await context.request.post("/api/gamification/activity", { headers: authHeaders(token) });
  expect(res.ok()).toBeTruthy();
}

async function getNotifications(context: BrowserContext, token: string) {
  const res = await context.request.get("/api/notifications", { headers: authHeaders(token) });
  expect(res.ok()).toBeTruthy();
  return res.json() as Promise<{
    notifications: Array<{ type: string; title: string; body: string; readAt: string | null }>;
    unreadCount: number;
  }>;
}

async function getFeedReview(context: BrowserContext, excludeReviewIds: string[] = []) {
  const res = await context.request.get("/api/feed?limit=20");
  expect(res.ok()).toBeTruthy();
  const data = (await res.json()) as {
    reviews: Array<{ id: string; rating: number; product: { name: string } }>;
  };
  const review = data.reviews.find((r) => !excludeReviewIds.includes(r.id));
  expect(review).toBeTruthy();
  return review!;
}

async function submitGuess(context: BrowserContext, token: string, reviewId: string, guessedRating: number) {
  const res = await context.request.post(`/api/guesses/${reviewId}`, {
    data: { guessedRating },
    headers: authHeaders(token),
  });
  expect(res.ok()).toBeTruthy();
}

async function submitDailyDropAttempt(
  context: BrowserContext,
  token: string,
  dailyDropId: string,
  guessedRating: number
) {
  const res = await context.request.post(`/api/dailydrop/${dailyDropId}/attempt`, {
    data: { guessedRating },
    headers: authHeaders(token),
  });
  expect(res.ok()).toBeTruthy();
}

function yesterdayString(): string {
  const now = new Date();
  const yesterday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
  return yesterday.toISOString().slice(0, 10);
}

test.describe.configure({ mode: "serial" });

test.describe("notifications all types", () => {
  // Creating users, scheduling drops, and running challenge flows can be slow
  // under concurrent test load, so give the end-to-end flow extra time.
  test.setTimeout(120000);

  test.skip(
    ({ browserName }) => browserName === "webkit",
    "desktop WebKit emulator is too flaky for this flow"
  );

  test("all four launch notification types appear in the list and settings persist", async ({ page, browser }) => {
    // 1. Log in as admin via UI and create a dedicated admin API context.
    await loginAsAdmin(page);
    const adminLoginContext = await browser.newContext();
    const adminToken = await apiLogin(adminLoginContext, "demo@silentreview.app", DEMO_PASSWORD);
    await adminLoginContext.close();
    const adminContext = await browser.newContext({
      extraHTTPHeaders: { Authorization: `Bearer ${adminToken}` },
    });

    // 2. Ensure today's Daily Drop is scheduled so the live notification can target users.
    const scheduleRes = await adminContext.request.post("/api/dailydrop/schedule");
    expect(scheduleRes.ok()).toBeTruthy();
    const scheduleBody = (await scheduleRes.json()) as { scheduled: number };
    expect(scheduleBody.scheduled).toBeGreaterThanOrEqual(0);

    const todayRes = await adminContext.request.get("/api/dailydrop/today");
    expect(todayRes.ok()).toBeTruthy();
    const todayDrop = (await todayRes.json()) as { dailyDrop: { id: string; reviewId: string } };
    const todayReviewId = todayDrop.dailyDrop.reviewId;

    // 3. Register Player A.
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    const userA = await registerFreshUser(pageA);

    // 4. Build a streak for Player A by playing yesterday's Daily Drop. This also
    //    sets lastActiveAt so daily-live targeting includes them, and makes them
    //    eligible for the streak-at-risk notification.
    const yesterdayReview = await getFeedReview(contextA, [todayReviewId]);
    const yesterdayStr = yesterdayString();
    const overrideRes = await adminContext.request.post("/api/dailydrop/override", {
      data: { date: yesterdayStr, reviewId: yesterdayReview.id },
      headers: { "Content-Type": "application/json" },
    });
    expect(overrideRes.ok()).toBeTruthy();
    const yesterdayDrop = (await overrideRes.json()) as { id: string; reviewId: string };

    await submitDailyDropAttempt(contextA, userA.token, yesterdayDrop.id, 5);
    const userAAfterStreak = await gamificationMe(contextA, userA.token);
    expect(userAAfterStreak.streakDays).toBeGreaterThanOrEqual(1);

    // 5. Trigger the DAILY_DROP notification for active users.
    const dailyLiveRes = await adminContext.request.post("/api/admin/run-daily-live");
    expect(dailyLiveRes.ok()).toBeTruthy();

    // 6. Trigger the STREAK_AT_RISK notification for users with an active streak
    //    who have not completed today's Daily Drop.
    const streakRes = await adminContext.request.post("/api/admin/run-streak-at-risk");
    expect(streakRes.ok()).toBeTruthy();

    // 7. Register Player B so Player A can challenge them on a non-Daily-Drop review.
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    const userB = await registerFreshUser(pageB);
    const userBId = (await me(contextB, userB.token)).user.id;

    const challengeReview = await getFeedReview(contextA, [todayReviewId, yesterdayReview.id]);
    // Guess deliberately below the actual rating so Player B can beat it.
    const challengerGuess = challengeReview.rating <= 2 ? 10 : 1;
    await submitGuess(contextA, userA.token, challengeReview.id, challengerGuess);

    const challengeRes = await contextA.request.post("/api/challenges/per-video", {
      data: { reviewId: challengeReview.id, challengedId: userBId },
      headers: authHeaders(userA.token),
    });
    expect(challengeRes.ok()).toBeTruthy();
    const challenge = (await challengeRes.json()) as { challenge: { id: string } };

    // 8. Player B accepts the challenge and guesses the exact rating, beating Player A.
    const acceptRes = await contextB.request.post(`/api/challenges/per-video/${challenge.challenge.id}/accept`, {
      headers: authHeaders(userB.token),
    });
    expect(acceptRes.ok()).toBeTruthy();
    await submitGuess(contextB, userB.token, challengeReview.id, challengeReview.rating);

    // 9. Assert all four launch notification types reached the expected players.
    await expect(async () => {
      const notificationsA = await getNotifications(contextA, userA.token);
      expect(notificationsA.notifications.some((n) => n.type === "DAILY_DROP")).toBe(true);
      expect(notificationsA.notifications.some((n) => n.type === "STREAK_AT_RISK")).toBe(true);
      expect(notificationsA.notifications.some((n) => n.type === "CHALLENGE_BEAT")).toBe(true);
    }).toPass({ timeout: DEFAULT_TIMEOUT });

    await expect(async () => {
      const notificationsB = await getNotifications(contextB, userB.token);
      expect(notificationsB.notifications.some((n) => n.type === "CHALLENGE_RECEIVED")).toBe(true);
    }).toPass({ timeout: DEFAULT_TIMEOUT });

    // 10. Verify the notification settings toggles in the UI persist after reload.
    await pageA.goto("/notifications/settings");
    const challengesToggle = pageA.getByRole("switch", { name: "New challenges" });
    await expect(challengesToggle).toBeVisible({ timeout: DEFAULT_TIMEOUT });
    await expect(challengesToggle).toHaveAttribute("aria-checked", "true");

    const prefsResponse = pageA.waitForResponse(
      (res) => res.url().includes("/api/notifications/preferences") && res.request().method() === "PATCH"
    );
    await challengesToggle.click();
    await prefsResponse;

    await pageA.reload();
    const challengesToggleAfterReload = pageA.getByRole("switch", { name: "New challenges" });
    await expect(challengesToggleAfterReload).toHaveAttribute("aria-checked", "false", {
      timeout: DEFAULT_TIMEOUT,
    });

    await adminContext.close();
    await contextA.close();
    await contextB.close();
  });
});
