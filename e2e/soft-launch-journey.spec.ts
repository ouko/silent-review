import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { loginDemoUser, registerFreshUser, DEMO_PASSWORD } from "./helpers/auth";

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
  return res.json() as Promise<{ user: { id: string; email: string; username: string; streakDays: number } }>;
}

async function getFeedReview(context: BrowserContext) {
  const res = await context.request.get("/api/feed?limit=20");
  expect(res.ok()).toBeTruthy();
  const data = (await res.json()) as {
    reviews: Array<{ id: string; rating: number; product: { name: string } }>;
  };
  const review = data.reviews.find((r) => r.rating >= 3);
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

async function getNotifications(context: BrowserContext, token: string) {
  const res = await context.request.get("/api/notifications", { headers: authHeaders(token) });
  expect(res.ok()).toBeTruthy();
  return res.json() as Promise<{
    notifications: Array<{ type: string; title: string; body: string }>;
    unreadCount: number;
  }>;
}

async function setActive(context: BrowserContext, token: string) {
  const res = await context.request.post("/api/gamification/activity", { headers: authHeaders(token) });
  expect(res.ok()).toBeTruthy();
}

test.describe("soft-launch journey", () => {
  test.setTimeout(120000);
  test("admin can seed drops, players get notifications, dashboard reflects events", async ({ page, browser }) => {
    // 1. Admin logs in via UI (for the dashboard later) and creates an API context for admin endpoints.
    await loginDemoUser(page);
    const tempContext = await browser.newContext();
    const adminToken = await apiLogin(tempContext, "demo@silentreview.app", DEMO_PASSWORD);
    await tempContext.close();
    const adminContext = await browser.newContext({
      extraHTTPHeaders: { Authorization: `Bearer ${adminToken}` },
    });

    const scheduleRes = await adminContext.request.post("/api/dailydrop/schedule");
    expect(scheduleRes.ok()).toBeTruthy();
    const scheduleBody = (await scheduleRes.json()) as { scheduled: number };
    expect(scheduleBody.scheduled).toBeGreaterThanOrEqual(0);

    // 3. Register two fresh players in isolated contexts.
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    const userA = await registerFreshUser(pageA);
    const userAId = (await me(contextA, userA.token)).user.id;

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    const userB = await registerFreshUser(pageB);
    const userBId = (await me(contextB, userB.token)).user.id;

    // 4. Player A plays today's Daily Drop (drives streak / first-round events).
    const todayRes = await contextA.request.get("/api/dailydrop/today", { headers: authHeaders(userA.token) });
    expect(todayRes.ok()).toBeTruthy();
    const todayBody = (await todayRes.json()) as { dailyDrop: { id: string } };
    const attemptRes = await contextA.request.post(`/api/dailydrop/${todayBody.dailyDrop.id}/attempt`, {
      data: { guessedRating: 5 },
      headers: authHeaders(userA.token),
    });
    expect(attemptRes.ok()).toBeTruthy();

    // Mark Player A active so the daily-live scheduler targets them, then trigger it.
    await setActive(contextA, userA.token);
    const dailyLiveRes = await adminContext.request.post("/api/admin/run-daily-live");
    expect(dailyLiveRes.ok()).toBeTruthy();

    // 5. Player A picks a non-Daily-Drop review, guesses just below the real rating,
    //    then challenges Player B.
    const review = await getFeedReview(contextA);
    const aGuess = Math.max(1, review.rating - 1);
    await submitGuess(contextA, userA.token, review.id, aGuess);

    const challengeRes = await contextA.request.post("/api/challenges/per-video", {
      data: { reviewId: review.id, challengedId: userBId },
      headers: authHeaders(userA.token),
    });
    expect(challengeRes.ok()).toBeTruthy();
    const challenge = (await challengeRes.json()) as { challenge: { id: string } };

    // 6. Player B accepts and guesses the real rating, beating Player A.
    const acceptRes = await contextB.request.post(`/api/challenges/per-video/${challenge.challenge.id}/accept`, {
      headers: authHeaders(userB.token),
    });
    expect(acceptRes.ok()).toBeTruthy();
    await submitGuess(contextB, userB.token, review.id, review.rating);

    // 7. Assert the notification types reached the right players.
    const notificationsA = await getNotifications(contextA, userA.token);
    expect(notificationsA.notifications.some((n) => n.type === "DAILY_DROP")).toBe(true);
    expect(notificationsA.notifications.some((n) => n.type === "CHALLENGE_BEAT")).toBe(true);

    const notificationsB = await getNotifications(contextB, userB.token);
    expect(notificationsB.notifications.some((n) => n.type === "CHALLENGE_RECEIVED")).toBe(true);

    // 8. Notification settings toggles persist to the server.
    await pageA.goto("/notifications/settings");
    await pageA.getByText("New challenges").click();
    await pageA.reload();
    const toggle = pageA.getByRole("switch", { name: "New challenges" });
    await expect(toggle).toHaveAttribute("aria-checked", "false");

    // 9. Analytics events can be ingested and rolled up, then viewed on the dashboard.
    const eventsRes = await contextA.request.post("/api/analytics/events/batch", {
      data: {
        events: [
          { type: "app_open", userId: userAId, sessionId: "e2e", channel: "organic" },
          { type: "first_round_complete", userId: userAId, sessionId: "e2e", channel: "organic" },
          { type: "share_card_created", userId: userAId, sessionId: "e2e", channel: "organic" },
        ],
      },
      headers: { "Content-Type": "application/json" },
    });
    expect(eventsRes.ok()).toBeTruthy();

    const rollupRes = await adminContext.request.post("/api/analytics/rollup");
    expect(rollupRes.ok()).toBeTruthy();

    await page.goto("/admin");
    await page.getByRole("tab", { name: /metrics/i }).click();
    await expect(page.getByText(/retention|K-factor|share rate|streak/i).first()).toBeVisible();

    const dashRes = await adminContext.request.get("/api/analytics/dashboard?days=30");
    expect(dashRes.ok()).toBeTruthy();
    const dash = (await dashRes.json()) as Record<string, unknown>;
    expect(Object.keys(dash).length).toBeGreaterThan(0);

    await adminContext.close();
  });
});
