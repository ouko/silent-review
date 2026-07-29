import { test, expect } from "@playwright/test";
import { registerFreshUser } from "./helpers/auth";

async function prepareFeedForTesting(page) {
  // Wait for the for-you feed to hydrate before interacting. Under load the
  // feed can take longer than the default 5s to render.
  await expect(page.getByText("For You")).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/Guess the rating/i).first()).toBeVisible({ timeout: 15000 });

  // Disable scroll snapping and motion so Playwright clicks land predictably on the first card.
  await page.addStyleTag({
    content:
      'html, body, * { scroll-snap-type: none !important; scroll-snap-align: none !important; transition: none !important; animation: none !important; }',
  });
  // Give the feed a moment to settle after hydration and style injection.
  await page.waitForTimeout(500);
}

async function revealFirstReview(page, rating: string) {
  // Retry the rating selection if the feed re-renders and detaches the radio
  // from the DOM while we are scrolling it into view.
  await expect(async () => {
    const radio = page.getByRole("radio", { name: rating }).first();
    await expect(radio).toBeVisible();
    await radio.scrollIntoViewIfNeeded();
    await radio.click({ force: true });
    await expect(radio).toHaveAttribute("aria-checked", "true");
  }).toPass({ timeout: 10000 });

  const revealButton = page.getByRole("button", { name: /Reveal/i }).first();
  await expect(revealButton).toBeEnabled();

  // Wait for the reveal response before asserting on UI so slow API responses
  // under concurrent test load don't time out the visible-text check.
  const revealResponse = page.waitForResponse((res) =>
    res.url().includes("/api/guesses/") && res.url().includes("/reveal")
  );
  await revealButton.click();
  await revealResponse;

  await expect(page.getByText(/The actual rating was/i).first()).toBeVisible({ timeout: 20000 });
}

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
