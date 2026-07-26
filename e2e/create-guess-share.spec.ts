import { test, expect } from "@playwright/test";

const DEMO_PASSWORD = "DemoPass123!";

async function registerFreshUser(page, suffix: string) {
  await page.goto("/register");
  await page.getByPlaceholder("Email").fill(`e2e-${suffix}@silentreview.app`);
  await page.getByPlaceholder("Username").fill(`e2euser${suffix}`);
  await page.getByPlaceholder("Password").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: /sign up with email/i }).click();
  await expect(page).toHaveURL("/", { timeout: 10000 });
  // Wait for the for-you feed to hydrate before interacting.
  await expect(page.getByText("For You")).toBeVisible();
  await expect(page.getByText(/Guess the rating/i).first()).toBeVisible();

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
  await radio.click();

  const revealButton = page.getByRole("button", { name: /Reveal/i }).first();
  await expect(revealButton).toBeEnabled();
  await revealButton.click();

  await expect(page.getByText(/The actual rating was/i).first()).toBeVisible({ timeout: 10000 });
}

test.describe.configure({ mode: "serial" });

test.describe("guess and reveal journey", () => {
  test("fresh user can guess on a seeded review and reveal the rating", async ({ page }) => {
    const suffix = `${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
    await registerFreshUser(page, suffix);

    await revealFirstReview(page, "7");

    await expect(page.getByRole("button", { name: /Share/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Play again/i }).first()).toBeVisible();
  });

  test("user can replay the same review", async ({ page }) => {
    const suffix = `${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
    await registerFreshUser(page, suffix);

    await revealFirstReview(page, "5");

    await page.getByRole("button", { name: /Play again/i }).first().click();
    await expect(page.getByText(/Guess the rating/i).first()).toBeVisible();
  });
});
