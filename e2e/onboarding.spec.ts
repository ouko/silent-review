import { test, expect } from "@playwright/test";
import { registerFreshUser, loginDemoUser } from "./helpers/auth";

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
    await registerFreshUser(page, { password: "E2EPass123!" });
  });

  test("existing demo user can log in", async ({ page }) => {
    await loginDemoUser(page);
  });
});
