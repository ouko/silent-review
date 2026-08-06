import { test, expect } from "@playwright/test";
import { registerFreshUser } from "./helpers/auth";

test("new user lands on Play home and starts a round within 2 taps", async ({ page }) => {
  await registerFreshUser(page);

  // Already on /play after registration
  await expect(page).toHaveURL("/play");
  await expect(page.getByText("Daily Drop")).toBeVisible();

  // Tap the Daily Drop card (tap 1)
  await page.getByRole("button", { name: /Play today's guess/i }).click();

  // The Daily Drop now routes to /dailydrop.
  await expect(page).toHaveURL(/\/dailydrop/);
  await expect(page.getByText(/Guess the rating/i)).toBeVisible();
});
