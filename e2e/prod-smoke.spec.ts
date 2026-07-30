/**
 * Production smoke suite: exercises the critical user workflows end to end
 * against a deployed environment (no seed data required).
 *
 * Run:
 *   PLAYWRIGHT_BASE_URL=https://your-domain pnpm test:e2e e2e/prod-smoke.spec.ts
 *
 * Creates uniquely-named test accounts/content in the target environment;
 * safe to run repeatedly.
 */
import { test, expect, type Page, type Browser } from "@playwright/test";
import { registerFreshUser, DEMO_PASSWORD } from "./helpers/auth";
import { generateVideoFixture } from "./helpers/fixtures";

const RATING = 7;

async function createReviewWithProduct(page: Page, videoPath: string) {
  await page.goto("/record");
  await page.getByRole("button", { name: /Add new product/i }).click();
  await page.getByPlaceholder("Product name").fill(`Smoke Product ${Date.now()}`);
  await page.getByRole("button", { name: /Add Product/i }).click();

  const fileInput = page.locator('input[type="file"][accept="video/*"]').first();
  await fileInput.setInputFiles(videoPath);
  await expect(page.locator("video").first()).toBeVisible({ timeout: 15000 });

  await page.getByRole("radio", { name: `${RATING}` }).click();
  await page.getByRole("button", { name: /Post review/i }).click();
  await expect(page).toHaveURL(/\/review\//, { timeout: 90000 });
}

async function registerViaInvite(browser: Browser, inviteCode: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`/register?invite=${inviteCode}`);
  await page.getByPlaceholder("Email").fill(`smoke-invite-${Date.now()}@silentreview.app`);
  await page.getByPlaceholder("Username").fill(`smokeinv${Date.now()}`.slice(0, 22));
  await page.getByPlaceholder("Password").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: /sign up with email/i }).click();
  await expect(page).toHaveURL("/", { timeout: 30000 });
  await context.close();
}

test.describe("production smoke", () => {
  test.describe.configure({ mode: "serial", timeout: 300000 });

  test("creator journey: register, record-upload, rate, post, profile", async ({ page }) => {
    await registerFreshUser(page);

    const videoPath = await generateVideoFixture("smoke-valid", {
      width: 1280,
      height: 720,
      filter: "testsrc=duration=5:size=1280x720:rate=30",
    });
    await createReviewWithProduct(page, videoPath);

    // Review appears on the creator's profile; stats sheets open.
    await page.goto("/profile/me");
    await expect(page.locator("[data-profile-username]")).toBeVisible({ timeout: 15000 });

    await page.getByRole("button", { name: /^followers$/i }).click();
    await expect(page.getByRole("dialog", { name: /followers/i })).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();

    await page.getByRole("button", { name: /^following$/i }).click();
    await expect(page.getByRole("dialog", { name: /following/i })).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();
  });

  test("viewer journey: feed, guess+reveal, like, comment, follow, invite, logout", async ({
    page,
    browser,
  }) => {
    // Creator posts a review.
    await registerFreshUser(page);
    const videoPath = await generateVideoFixture("smoke-viewer", {
      filter: "testsrc=duration=5:size=640x480:rate=30",
    });
    await createReviewWithProduct(page, videoPath);
    const reviewUrl = page.url();

    // Viewer (separate context) finds it on the feed and interacts.
    const viewerContext = await browser.newContext();
    const viewer = await viewerContext.newPage();
    await registerFreshUser(viewer);

    await viewer.goto("/");
    const commentLink = viewer.locator('a[aria-label="Comment on review"]').first();
    await expect(commentLink).toBeVisible({ timeout: 30000 });
    await commentLink.evaluate((el: HTMLElement) => el.click());
    await expect(viewer).toHaveURL(/\/review\//);

    // Guess + reveal.
    await viewer.getByRole("radio", { name: "6" }).click();
    await viewer.getByRole("button", { name: /Reveal/i }).first().click();
    await expect(viewer.getByText(new RegExp(`${RATING}`)).first()).toBeVisible({ timeout: 30000 });

    // Like.
    const likeButton = viewer.getByRole("button", { name: /^(Like|Unlike) review/i });
    await expect(likeButton).toBeEnabled({ timeout: 30000 });
    if ((await likeButton.getAttribute("aria-label"))?.startsWith("Unlike")) {
      await likeButton.click();
      await expect(viewer.getByRole("button", { name: /^Like review/i })).toBeEnabled({ timeout: 10000 });
    }
    await viewer.getByRole("button", { name: /^Like review/i }).click();
    await expect(viewer.getByRole("button", { name: /^Unlike review/i })).toBeVisible();

    // Comment.
    const commentText = `smoke comment ${Date.now()}`;
    await viewer.getByPlaceholder("Add a comment...").fill(commentText);
    await viewer.getByRole("button", { name: /Post comment/i }).click();
    await expect(viewer.getByText(commentText).first()).toBeVisible({ timeout: 15000 });

    // Follow the creator from their profile (via author link on the review).
    await viewer.goto(reviewUrl);
    await viewer.locator('a[href*="/profile/"]').first().click();
    await expect(viewer).toHaveURL(/\/profile\//);
    const followButton = viewer.getByRole("button", { name: /^(Follow|Unfollow) user/i });
    await expect(followButton).toBeVisible({ timeout: 15000 });
    if ((await followButton.getAttribute("aria-label")) === "Follow user") {
      await followButton.click();
      await expect(viewer.getByRole("button", { name: /^Unfollow user/i })).toBeVisible();
    }

    // Creator: invite a third user; invite is marked accepted.
    await page.goto("/viral");
    await page.getByRole("button", { name: "Copy link" }).click();
    const firstInvite = page.getByText(/invite\//i).first();
    await expect(firstInvite).toBeVisible({ timeout: 15000 });
    const inviteCode = ((await firstInvite.textContent()) ?? "").match(/invite\/([a-f0-9]+)/)?.[1];
    expect(inviteCode).toBeTruthy();
    await registerViaInvite(browser, inviteCode!);
    await page.reload();
    await expect(page.getByText("joined").first()).toBeVisible({ timeout: 15000 });

    // Logout returns to the login screen.
    await page.goto("/profile/me");
    await page.getByRole("button", { name: /log out/i }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });

    await viewerContext.close();
  });
});
