import { test, expect } from "@playwright/test";
import { loginDemoUser } from "./helpers/auth";

test.describe("profile stats navigation", () => {
  test("clicking reviews count selects the reviews tab", async ({ page }) => {
    await loginDemoUser(page);
    await page.goto("/profile/me");

    await page.getByRole("button", { name: /reviews/i }).click();
    await expect(page.getByRole("tab", { name: /reviews/i })).toHaveAttribute("aria-selected", "true");
  });

  test("clicking followers count opens the followers sheet", async ({ page }) => {
    await loginDemoUser(page);
    await page.goto("/profile/me");

    await page.getByRole("button", { name: /followers/i }).click();
    const followersDialog = page.getByRole("dialog", { name: /followers/i });
    await expect(followersDialog).toBeVisible();
    await expect(followersDialog.getByRole("heading", { name: "Followers" })).toBeVisible();
  });

  test("clicking following count opens the following sheet", async ({ page }) => {
    await loginDemoUser(page);
    await page.goto("/profile/me");

    await page.getByRole("button", { name: /following/i }).click();
    const followingDialog = page.getByRole("dialog", { name: /following/i });
    await expect(followingDialog).toBeVisible();
    await expect(followingDialog.getByRole("heading", { name: "Following" })).toBeVisible();
  });
});
