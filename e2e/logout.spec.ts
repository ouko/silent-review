import { test, expect } from "@playwright/test";
import { registerFreshUser } from "./helpers/auth";

test.describe("logout", () => {
  test("clicking log out from own profile redirects to login", async ({ page }) => {
    await registerFreshUser(page);

    await page.goto("/profile/me");
    await expect(page.getByText("Edit profile")).toBeVisible();

    await page.getByRole("button", { name: /log out/i }).click();
    await expect(page).toHaveURL("/login", { timeout: 20000 });
  });
});
