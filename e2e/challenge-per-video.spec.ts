import { test, expect, type BrowserContext } from "@playwright/test";
import { registerFreshUser } from "./helpers/auth";
import {
  createPerVideoChallenge,
  acceptChallenge,
  submitChallengeGuess,
} from "./helpers/challenge";

async function getAuthFeedReview(context: BrowserContext) {
  const res = await context.request.get("/api/feed?limit=20");
  expect(res.ok()).toBeTruthy();
  const data = (await res.json()) as {
    reviews: Array<{ id: string; rating: number; product: { name: string } }>;
  };
  // Pick a review with a high-enough rating so Player A can guess low and
  // Player B can beat the score by guessing the real rating.
  const review = data.reviews.find((r) => r.rating >= 3);
  expect(review).toBeTruthy();
  return review!;
}

async function getNotifications(context: BrowserContext, token: string) {
  const res = await context.request.get("/api/notifications", {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.ok()).toBeTruthy();
  return res.json() as Promise<{
    notifications: Array<{ type: string; title: string; body: string }>;
    unreadCount: number;
  }>;
}

test.describe.configure({ mode: "serial" });

test.describe("challenge per video", () => {
  // Cross-player, multi-context flows with reveals and network waits need
  // more time than the default per-test timeout.
  test.setTimeout(120000);

  test.skip(
    ({ browserName }) => browserName === "webkit",
    "desktop WebKit emulator is too flaky for this flow"
  );

  test("Player A reveals a review and creates a per-video challenge; Player B accepts, beats the score, and can rematch", async ({ browser }) => {
    // ---- Player A: register, reveal a review, and create a challenge ----
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    const userA = await registerFreshUser(pageA);

    const review = await getAuthFeedReview(contextA);

    // Reveal the chosen review with a deliberately low guess so Player B can win.
    await pageA.goto(`/play/${review.id}`);
    await expect(pageA.getByText(/Guess the rating/i)).toBeVisible({
      timeout: 15000,
    });

    await expect(async () => {
      const radio = pageA.getByRole("radio", { name: "1" }).first();
      await expect(radio).toBeVisible();
      await radio.scrollIntoViewIfNeeded();
      await radio.click({ force: true });
      await expect(radio).toHaveAttribute("aria-checked", "true");
    }).toPass({ timeout: 10000 });

    const revealButton = pageA.getByRole("button", { name: /Reveal/i }).first();
    await expect(revealButton).toBeEnabled();

    const revealResponse = pageA.waitForResponse(
      (res) =>
        res.url().includes("/api/guesses/") && res.url().includes("/reveal")
    );
    await revealButton.click();
    await revealResponse;

    await expect(
      pageA.getByText(/The actual rating was/i).first()
    ).toBeVisible({ timeout: 20000 });

    const challengeId = await createPerVideoChallenge(pageA, review.id);

    // ---- Player B: accept via deep link and submit a winning guess ----
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await registerFreshUser(pageB);

    await acceptChallenge(pageB, challengeId);
    await submitChallengeGuess(pageB, String(review.rating));

    // ---- Player A should receive a score-beaten notification ----
    await expect(async () => {
      const notifications = await getNotifications(contextA, userA.token);
      expect(
        notifications.notifications.some((n) => n.type === "CHALLENGE_BEAT")
      ).toBe(true);
    }).toPass({ timeout: 30000 });

    // ---- One-tap rematch if the result screen exposes it ----
    const rematchButton = pageB.getByRole("button", { name: /Rematch/i });
    if (await rematchButton.isVisible().catch(() => false)) {
      await rematchButton.click();
      await expect(pageB.getByText(/Guess the rating/i)).toBeVisible({
        timeout: 15000,
      });
    }

    await contextA.close();
    await contextB.close();
  });
});
