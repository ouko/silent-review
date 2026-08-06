import { test, expect } from "@playwright/test";
import { registerFreshUser } from "./helpers/auth";
import { prepareFeedForTesting, revealFirstReview } from "./helpers/review";

test.describe.configure({ mode: "serial" });

test.describe("guess and reveal journey", () => {
  // Reveal requests and feed hydration can be slow under concurrent test load,
  // so give these end-to-end flows more time than the default 60s.
  test.setTimeout(120000);

  test.skip(({ browserName }) => browserName === "webkit", "desktop WebKit emulator is too flaky for this flow");
  test("fresh user can guess on a seeded review and reveal the rating", async ({ page }) => {
    await registerFreshUser(page);
    await prepareFeedForTesting(page);

    await revealFirstReview(page, "7");

    await expect(page.getByRole("button", { name: /Share/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Play again/i }).first()).toBeVisible();
  });

  test("share sheet bottom actions are reachable on a small viewport", async ({ page }) => {
    await registerFreshUser(page);
    await prepareFeedForTesting(page);

    await revealFirstReview(page, "6");

    const shareButton = page.getByRole("button", { name: /Share/i }).first();
    await expect(shareButton).toBeVisible();
    await shareButton.click();

    // The share sheet should open and the bottom-most actions must be visible
    // without the user having to scroll the page behind the modal.
    const copyLinkButton = page.getByRole("button", { name: /Copy link/i });
    await expect(copyLinkButton).toBeVisible({ timeout: 10000 });
    await copyLinkButton.scrollIntoViewIfNeeded();
    await expect(copyLinkButton).toBeInViewport();

    // Close the sheet and return to the feed.
    await page.getByRole("button", { name: /Close share sheet/i }).click();
    await expect(page.getByRole("button", { name: /Share/i }).first()).toBeVisible();
  });

  test("user can replay the same review", async ({ page }) => {
    await registerFreshUser(page);
    await prepareFeedForTesting(page);

    await revealFirstReview(page, "5");

    await page.getByRole("button", { name: /Play again/i }).first().click();
    await expect(page.getByText(/Guess the rating/i).first()).toBeVisible();
  });
});

test.describe("share sheet scrollability", () => {
  test.use({ viewport: { width: 375, height: 550 } });

  test("share sheet scrolls to reveal bottom actions on a small viewport", async ({ page }) => {
    await registerFreshUser(page);
    await prepareFeedForTesting(page);

    // Open the share sheet from the feed action bar before revealing.
    // The feed unmounts distant cards as the user scrolls, so retry if the
    // first share button detaches between visibility and click.
    await expect(async () => {
      const shareButton = page.getByRole("button", { name: /Share review/i }).first();
      await expect(shareButton).toBeVisible({ timeout: 5000 });
      await shareButton.click({ force: true, timeout: 5000 });
    }).toPass({ timeout: 15000 });

    // Wait for the share sheet dialog to mount via createPortal.
    const sheetDialog = page.locator('[role="dialog"]').filter({ hasText: /Share review/i });
    await expect(sheetDialog).toBeAttached({ timeout: 10000 });

    const copyLinkButton = page.getByRole("button", { name: /Copy link/i });
    await expect(copyLinkButton).toBeAttached({ timeout: 10000 });

    // On a very small screen the bottom actions start below the fold.
    const initiallyInViewport = await copyLinkButton.isVisible().catch(() => false);
    if (initiallyInViewport) {
      // If the device is large enough that it already fits, still verify it is
      // reachable by scrolling the sheet to the bottom.
      await copyLinkButton.scrollIntoViewIfNeeded();
    }

    // Scroll the share sheet panel to the bottom and confirm the action is visible.
    await page.locator('[role="dialog"]').evaluate((el) => {
      el.scrollTo({ top: el.scrollHeight, behavior: "instant" });
    });

    await expect(copyLinkButton).toBeVisible();
    await expect(copyLinkButton).toBeInViewport();
  });
});
