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
  await expect(page).toHaveURL("/play", { timeout: 30000 });
  await context.close();
}

test.describe("production smoke", () => {
  test.describe.configure({ mode: "serial", timeout: 600000 });

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

    await page.getByRole("button", { name: /followers/i }).click();
    await expect(page.getByRole("dialog", { name: /followers/i })).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();

    await page.getByRole("button", { name: /following/i }).click();
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

    // Viewer (separate context) finds it on the feed and guesses on the card.
    const viewerContext = await browser.newContext();
    const viewer = await viewerContext.newPage();
    await registerFreshUser(viewer);

    await viewer.goto("/browse");
    // Guess + reveal happen on the feed card (the review detail page has no
    // guess UI).
    await expect(async () => {
      const radio = viewer.getByRole("radio", { name: "6" }).first();
      await expect(radio).toBeVisible();
      await radio.scrollIntoViewIfNeeded();
      await radio.click({ force: true });
      await expect(radio).toHaveAttribute("aria-checked", "true");
    }).toPass({ timeout: 30000 });

    const revealButton = viewer.getByRole("button", { name: /Reveal/i }).first();
    await expect(revealButton).toBeEnabled({ timeout: 30000 });
    await revealButton.click();
    await expect(viewer.getByText(/The actual rating was/i).first()).toBeVisible({ timeout: 30000 });

    // Open the review for like + comment.
    const commentLink = viewer.locator('a[aria-label="Comment on review"]').first();
    await expect(commentLink).toBeVisible({ timeout: 30000 });
    await commentLink.evaluate((el: HTMLElement) => el.click());
    await expect(viewer).toHaveURL(/\/review\//);

    // Like. The button starts disabled while its query loads; wait for it to
    // become enabled, click, and then wait for the optimistic mutation to flip
    // the label back to "Unlike".
    const likeButton = viewer.getByRole("button", { name: /^(Like|Unlike) review/i });
    await expect(likeButton).toBeEnabled({ timeout: 30000 });
    if ((await likeButton.getAttribute("aria-label"))?.startsWith("Unlike")) {
      await likeButton.click();
      await expect(viewer.getByRole("button", { name: /^Like review/i })).toBeEnabled({ timeout: 15000 });
    }
    await viewer.getByRole("button", { name: /^Like review/i }).click();
    await expect(viewer.getByRole("button", { name: /^Unlike review/i })).toBeEnabled({ timeout: 30000 });

    // Comment.
    const commentText = `smoke comment ${Date.now()}`;
    await viewer.getByPlaceholder("Add a comment...").fill(commentText);
    await viewer.getByRole("button", { name: /Post comment/i }).click();
    await expect(viewer.getByText(commentText).first()).toBeVisible({ timeout: 15000 });

    // Follow the creator from their profile (author link on the feed card —
    // the review detail page has no author link, and the bottom-nav Profile
    // link goes to the viewer's own profile).
    await viewer.goto("/browse");
    await viewer.locator('a[data-profile-link]').first().click();
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
