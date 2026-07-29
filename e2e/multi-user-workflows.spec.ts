import { test, expect, type Page, type BrowserContext, type Locator } from "@playwright/test";
import { DEMO_PASSWORD } from "./helpers/auth";

/**
 * These tests exercise the three primary demo accounts end-to-end. They verify
 * that each user can log in, consume the feed (newest first, tags visible),
 * interact with another user's content, and see those interactions reflected
 * in notifications / the following feed.
 */

test.describe.configure({ mode: "serial" });

test.setTimeout(120000);

interface DemoUser {
  email: string;
  username: string;
  displayName: string;
}

const DEMO_USERS: DemoUser[] = [
  { email: "demo@silentreview.app", username: "demouser", displayName: "Demo User" },
  { email: "alice@silentreview.app", username: "alice", displayName: "Alice" },
  { email: "bob@silentreview.app", username: "bob", displayName: "Bob" },
];

interface CurrentUser {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
}

interface FeedReview {
  id: string;
  createdAt: string;
  productTag: string | null;
  caption: string | null;
  user: { id: string; username: string; displayName: string | null };
}

interface AuthSession {
  accessToken: string;
  user: CurrentUser;
}

async function loginAs(page: Page, email: string): Promise<AuthSession> {
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill(DEMO_PASSWORD);

  const submitButton = page.getByRole("button", { name: /log in with email/i });
  await expect(submitButton).toBeEnabled();

  const loginResponse = page.waitForResponse((res) =>
    res.url().includes("/api/auth/login")
  );
  await submitButton.click();
  const loginRes = await loginResponse;

  await expect(page).toHaveURL("/", { timeout: 20000 });
  await expect(page.getByText("For You")).toBeVisible({ timeout: 15000 });

  const body = (await loginRes.json()) as { accessToken: string; user: CurrentUser };
  return { accessToken: body.accessToken, user: body.user };
}

async function switchToUser(page: Page, context: BrowserContext, email: string): Promise<AuthSession> {
  await context.clearCookies();
  await page.goto("/login");
  await expect(page.getByRole("button", { name: /log in with email/i })).toBeVisible();
  return loginAs(page, email);
}

async function forYouFeed(page: Page, token: string): Promise<FeedReview[]> {
  const res = await page.request.get("/api/feed?limit=50", {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.ok()).toBe(true);
  const body = (await res.json()) as { reviews: FeedReview[] };
  return body.reviews;
}

function feedCards(page: Page): Locator {
  return page.locator("[data-review-id]");
}

async function scrollToFeedCard(page: Page, index: number) {
  const feed = page.locator(".snap-y.snap-mandatory");
  await feed.evaluate((el, idx) => {
    el.scrollTo({ top: idx * el.clientHeight, behavior: "instant" });
  }, index);
  await page.waitForTimeout(300);
}

async function findCardIndexById(page: Page, id: string): Promise<number> {
  return feedCards(page).evaluateAll(
    (els, targetId) => els.findIndex((e) => e.getAttribute("data-review-id") === targetId),
    id
  );
}

test("all demo users can log in and see a recent, tag-rich feed", async ({ page, context }) => {
  for (const user of DEMO_USERS) {
    await context.clearCookies();
    const session = await loginAs(page, user.email);
    expect(session.user.username).toBe(user.username);

    const feed = await forYouFeed(page, session.accessToken);
    expect(feed.length, `${user.username} should have a non-empty feed`).toBeGreaterThan(0);

    // Newest reviews first.
    for (let i = 1; i < feed.length; i++) {
      const prev = new Date(feed[i - 1].createdAt).getTime();
      const curr = new Date(feed[i].createdAt).getTime();
      expect(prev, "feed should be sorted by createdAt descending").toBeGreaterThanOrEqual(curr);
    }

    // The first card should expose the author and product tag in the UI.
    const firstCard = feedCards(page).first();
    await expect(firstCard.getByText(`@${feed[0].user.username}`)).toBeVisible();
    if (feed[0].productTag) {
      await expect(firstCard.getByText(`#${feed[0].productTag}`)).toBeVisible();
    }

    // A user should see their own profile reviews.
    await page.goto("/profile/me");
    await expect(page.getByText("No reviews yet")).not.toBeVisible();
  }
});

test("demo users can guess, like, and comment on each other's reviews", async ({ page, context }) => {
  // Find any primary-demo pair where the actor can see another primary user's review.
  let actor: DemoUser | null = null;
  let target: FeedReview | null = null;
  let session: AuthSession | null = null;

  for (const candidate of DEMO_USERS) {
    session = await switchToUser(page, context, candidate.email);
    const feed = await forYouFeed(page, session.accessToken);
    const others = DEMO_USERS.filter((u) => u.username !== candidate.username).map((u) => u.username);
    const match = feed.find((r) => others.includes(r.user.username));
    if (match) {
      actor = candidate;
      target = match;
      break;
    }
  }

  expect(actor, "at least one demo user should see another demo user's review").not.toBeNull();
  expect(target).not.toBeNull();
  expect(session).not.toBeNull();

  // Open the target review via the feed comment link and react to it.
  let index = await findCardIndexById(page, target!.id);
  let scrollAttempts = 0;
  while (index < 0 && scrollAttempts < 20) {
    scrollAttempts++;
    await scrollToFeedCard(page, scrollAttempts);
    index = await findCardIndexById(page, target!.id);
  }
  expect(index, "target review card should be rendered in the feed").toBeGreaterThanOrEqual(0);
  await scrollToFeedCard(page, index);

  const targetCard = page.locator(`[data-review-id="${target!.id}"]`).first();
  await targetCard.locator('a[aria-label="Comment on review"]').click();

  const displayName = target!.user.displayName || target!.user.username;
  await expect(page.getByText(new RegExp(displayName))).toBeVisible();

  const likeButton = page.getByRole("button", { name: /^(Like|Unlike) review/i });
  await expect(likeButton).toBeVisible();
  await expect(likeButton).toBeEnabled({ timeout: 10000 });
  const likeLabel = await likeButton.getAttribute("aria-label");
  // Ensure a fresh like (and notification) by unliking first if already liked.
  if (likeLabel?.startsWith("Unlike")) {
    const unlikeResponse = page.waitForResponse((res) =>
      res.url().includes(`/api/likes/reviews/${target!.id}`) && res.request().method() === "POST"
    );
    await likeButton.click();
    await unlikeResponse;
    await expect(page.getByRole("button", { name: /^Like review/i })).toBeEnabled({ timeout: 10000 });
  }
  const likeResponse = page.waitForResponse((res) =>
    res.url().includes(`/api/likes/reviews/${target!.id}`) && res.request().method() === "POST"
  );
  await page.getByRole("button", { name: /^Like review/i }).click();
  await likeResponse;
  await expect(page.getByRole("button", { name: /^Unlike review/i })).toBeVisible();

  const commentText = `Great take from the e2e suite! ${Date.now()}`;
  await page.getByPlaceholder("Add a comment...").fill(commentText);
  const commentResponse = page.waitForResponse((res) =>
    res.url().includes(`/api/comments/reviews/${target!.id}/comments`) && res.request().method() === "POST"
  );
  await page.getByRole("button", { name: /Post comment/i }).click();
  await commentResponse;
  await expect(page.getByText(commentText).first()).toBeVisible();

  // Switch to the review owner and confirm notifications arrived.
  const owner = DEMO_USERS.find((u) => u.username === target!.user.username);
  expect(owner, "target review owner should be a known demo user").toBeDefined();

  await switchToUser(page, context, owner!.email);
  await page.getByRole("link", { name: "Profile" }).click();
  await expect(page).toHaveURL("/profile/me");

  // Wait for the notifications API so the test does not race the React Query fetch.
  const notificationsResponse = page.waitForResponse(
    (res) => res.url().includes("/api/notifications") && res.request().method() === "GET"
  );
  await page.getByRole("tab", { name: "Activity" }).click();
  await notificationsResponse;

  await expect(page.getByText(/New like/).first()).toBeVisible();
  await expect(page.getByText(/New comment/).first()).toBeVisible();
  await expect(page.getByText(new RegExp(`${actor!.displayName} liked your review`)).first()).toBeVisible();
  await expect(page.getByText(new RegExp(`${actor!.displayName} commented on your review`)).first()).toBeVisible();
});

test("users can follow each other and see followed content on the Following feed", async ({ page, context }) => {
  // Find a primary-demo follower who currently sees a review by another primary user.
  let follower: DemoUser | null = null;
  let target: FeedReview | null = null;
  let session: AuthSession | null = null;

  for (const candidate of DEMO_USERS) {
    session = await switchToUser(page, context, candidate.email);
    const feed = await forYouFeed(page, session.accessToken);
    const others = DEMO_USERS.filter((u) => u.username !== candidate.username).map((u) => u.username);
    const match = feed.find((r) => others.includes(r.user.username));
    if (match) {
      follower = candidate;
      target = match;
      break;
    }
  }

  expect(follower, "a demo user should see another demo user's review").not.toBeNull();
  expect(target).not.toBeNull();

  // Tap the owner's username in the feed to open their profile.
  let index = await findCardIndexById(page, target!.id);
  let attempts = 0;
  while (index < 0 && attempts < 20) {
    attempts++;
    await scrollToFeedCard(page, attempts);
    index = await findCardIndexById(page, target!.id);
  }
  expect(index).toBeGreaterThanOrEqual(0);
  await scrollToFeedCard(page, index);

  const targetCard = page.locator(`[data-review-id="${target!.id}"]`).first();
  await targetCard.locator("a").first().click();

  await expect(page).toHaveURL(/\/profile\//);
  await expect(page.getByText(`@${target!.user.username}`)).toBeVisible();

  // Follow the owner (toggle off first if already following so the action is deterministic).
  const followButton = page.getByRole("button", { name: /^(Follow|Unfollow) user/i });
  await expect(followButton).toBeVisible();
  const followLabel = await followButton.getAttribute("aria-label");
  if (followLabel?.startsWith("Unfollow")) {
    await followButton.click();
    await expect(page.getByRole("button", { name: /^Follow user/i })).toBeVisible();
  }
  await page.getByRole("button", { name: /^Follow user/i }).click();
  await expect(page.getByRole("button", { name: /^Unfollow user/i })).toBeVisible();

  // The owner's content should now appear on the follower's Following feed.
  await page.getByRole("link", { name: "Home" }).click();
  await expect(page).toHaveURL("/");
  await page.getByRole("tab", { name: "Following" }).click();
  await expect(page.getByText(`@${target!.user.username}`).first()).toBeVisible();
});
