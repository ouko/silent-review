import { type Page, expect } from "@playwright/test";

export async function prepareFeedForTesting(page: Page) {
  // The game home (/play) is now the landing page after login/register.
  // Navigate to the browse feed where reviews are listed.
  await page.goto("/browse");

  // Wait for the for-you feed to hydrate before interacting. Under load the
  // feed can take longer than the default 5s to render.
  await expect(page.getByText("For You")).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/Guess the rating/i).first()).toBeVisible({ timeout: 15000 });
  await expect(page.locator("[data-review-id]").first()).toBeVisible({ timeout: 15000 });

  // Disable scroll snapping and motion so Playwright clicks land predictably on the first card.
  await page.addStyleTag({
    content:
      'html, body, * { scroll-snap-type: none !important; scroll-snap-align: none !important; transition: none !important; animation: none !important; }',
  });
  // Give the feed a moment to settle after hydration and style injection.
  await page.waitForTimeout(500);
}

export async function revealFirstReview(page: Page, rating: string) {
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
  const revealResponse = page.waitForResponse(
    (res) => res.url().includes("/api/guesses/") && res.url().includes("/reveal")
  );
  await revealButton.click();
  await revealResponse;

  await expect(page.getByText(/The actual rating was/i).first()).toBeVisible({ timeout: 20000 });
}
