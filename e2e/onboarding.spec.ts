import { test, expect } from "@playwright/test";

test.describe("onboarding", () => {
  test("guest can view login and register", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/Silent Review/);
    await expect(page.getByPlaceholder("Email")).toBeVisible();
    await expect(page.getByRole("button", { name: /log in with email/i })).toBeVisible();

    await page.click("text=Sign up");
    await expect(page).toHaveURL(/\/register/);
    await expect(page.getByPlaceholder("Username")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign up with email/i })).toBeVisible();
  });

  test("guest can register and land on the feed", async ({ page }) => {
    await page.goto("/register");

    const timestamp = Date.now();
    await page.getByPlaceholder("Email").fill(`e2e-${timestamp}@silentreview.app`);
    await page.getByPlaceholder("Username").fill(`e2euser${timestamp}`);
    await page.getByPlaceholder("Password").fill("E2EPass123!");
    await page.getByRole("button", { name: /sign up with email/i }).click();

    await expect(page).toHaveURL("/", { timeout: 10000 });
    await expect(page.getByText("For You")).toBeVisible();
  });

  test("existing demo user can log in", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("Email").fill("demo@silentreview.app");
    await page.getByPlaceholder("Password").fill("DemoPass123!");
    await page.getByRole("button", { name: /log in with email/i }).click();

    await expect(page).toHaveURL("/", { timeout: 10000 });
    await expect(page.getByText("For You")).toBeVisible();
  });
});
