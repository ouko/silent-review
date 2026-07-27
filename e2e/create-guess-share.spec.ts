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
  const radio = page.getByRole("radio", { name: rating }).first();
  await expect(radio).toBeVisible();
  // Scroll the rating bar into view and click its centre to avoid landing on
  // an adjacent snap-scrolled card. Force-click bypasses scroll-snap stability
  // checks that can otherwise time out in Mobile Chrome.
  await radio.scrollIntoViewIfNeeded();
  await radio.click({ force: true });
  await expect(radio).toHaveAttribute("aria-checked", "true");

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
  test.skip(({ browserName }) => browserName === "webkit", "desktop WebKit emulator is too flaky for this flow");
  test("fresh user can guess on a seeded review and reveal the rating", async ({ page }) => {
    await registerFreshUser(page);
    await prepareFeedForTesting(page);

    await revealFirstReview(page, "7");

    await expect(page.getByRole("button", { name: /Share/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Play again/i }).first()).toBeVisible();
  });

  test("user can replay the same review", async ({ page }) => {
    await registerFreshUser(page);
    await prepareFeedForTesting(page);

    await revealFirstReview(page, "5");

    await page.getByRole("button", { name: /Play again/i }).first().click();
    await expect(page.getByText(/Guess the rating/i).first()).toBeVisible();
  });
});
