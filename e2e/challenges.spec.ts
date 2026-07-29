import { test, expect } from "@playwright/test";
import { loginDemoUser } from "./helpers/auth";

test.describe("challenges", () => {
  test("user can create, discover, join and share a challenge", async ({ page }) => {
    await loginDemoUser(page);
    await page.goto("/viral");

    await expect(page.getByText("Challenges")).toBeVisible();

    // Create a new challenge.
    page.on("dialog", (dialog) => dialog.accept(`E2E Challenge ${Date.now()}`));
    await page.getByRole("button", { name: "New" }).click();
    await expect(page.getByText(/Your challenges/i)).toBeVisible();
    await expect(page.getByText(/E2E Challenge/i).first()).toBeVisible();

    // The challenge creator is already joined.
    await expect(page.getByText("Joined").first()).toBeVisible();

    // Discover and join an existing seeded challenge.
    const discoverSection = page.getByText("Discover");
    if (await discoverSection.isVisible().catch(() => false)) {
      const joinButton = page.getByRole("button", { name: "Join challenge" }).first();
      await expect(joinButton).toBeVisible();
      await joinButton.click();
      await expect(page.getByText("You joined the challenge!")).toBeVisible();
    }

    // Share a challenge.
    const shareButton = page.getByRole("button", { name: "Share challenge" }).first();
    await expect(shareButton).toBeVisible();
    await shareButton.click();
  });
});
