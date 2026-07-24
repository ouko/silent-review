import { test, expect } from "@playwright/test";

const DEMO_PASSWORD = "DemoPass123!";

async function registerFreshUser(page, suffix: string) {
  await page.goto("/register");
  await page.getByPlaceholder("Email").fill(`e2e-${suffix}@silentreview.app`);
  await page.getByPlaceholder("Username").fill(`e2euser${suffix}`);
  await page.getByPlaceholder("Password").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: /sign up with email/i }).click();
  await expect(page).toHaveURL("/", { timeout: 10000 });
}

test.describe.configure({ mode: "serial" });

test.describe("guess and reveal journey", () => {
  test("fresh user can guess on a seeded review and reveal the rating", async ({ page }) => {
    const suffix = `${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
    await registerFreshUser(page, suffix);

    // Seeded demo reviews should appear in the for-you feed.
    await expect(page.getByText("For You")).toBeVisible();
    await expect(page.getByText(/Guess the rating/i).first()).toBeVisible();

    // Select a rating and reveal.
    await page.getByRole("radio", { name: "7" }).first().click();
    await page.getByRole("button", { name: /Reveal/i }).first().click();

    // After reveal, the actual rating and share actions are visible.
    await expect(page.getByText(/The actual rating was/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /Share/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Play again/i }).first()).toBeVisible();
  });

  test("user can replay the same review", async ({ page }) => {
    const suffix = `${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
    await registerFreshUser(page, suffix);

    await page.getByRole("radio", { name: "5" }).first().click();
    await page.getByRole("button", { name: /Reveal/i }).first().click();

    await expect(page.getByText(/The actual rating was/i).first()).toBeVisible({ timeout: 10000 });

    await page.getByRole("button", { name: /Play again/i }).first().click();
    await expect(page.getByText(/Guess the rating/i).first()).toBeVisible();
  });
});
