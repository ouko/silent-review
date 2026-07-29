import { test, expect, type Browser } from "@playwright/test";
import { loginDemoUser } from "./helpers/auth";

test.describe("challenges", () => {
  test("user can create, discover, join and share a challenge", async ({ page, browser }) => {
    await loginDemoUser(page);
    await page.goto("/viral");

    await expect(page.getByRole("heading", { name: "Challenges", exact: true })).toBeVisible();

    // Create a new challenge.
    const challengeName = `E2E Challenge ${Date.now()}`;
    page.on("dialog", (dialog) => dialog.accept(challengeName));
    await page.getByRole("button", { name: "New" }).click();
    await expect(page.getByText(/Your challenges/i)).toBeVisible();
    await expect(page.getByText(challengeName)).toBeVisible();

    // The challenge creator is already joined.
    await expect(page.getByText("Joined").first()).toBeVisible();

    // Capture the challenge deep link so a second user can join.
    const challengeCard = page.locator("[data-testid='challenge-card']").filter({ hasText: challengeName });
    const challengeId = await challengeCard.getAttribute("data-challenge-id");
    expect(challengeId).toBeTruthy();

    // User B: join via deep link.
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await loginDemoUser(pageB);
    await pageB.goto(`/viral?join=${challengeId}`);
    await expect(pageB.getByText("Joined challenge!")).toBeVisible();
    await expect(pageB.getByText(challengeName)).toBeVisible();
    await expect(pageB.getByText("Joined").first()).toBeVisible();
    await contextB.close();

    // Discover and join an existing seeded challenge.
    const discoverSection = page.getByText("Discover");
    if (await discoverSection.isVisible().catch(() => false)) {
      const joinButton = page.getByRole("button", { name: "Join challenge" }).first();
      await expect(joinButton).toBeVisible();
      await joinButton.click();
      await expect(page.getByText("You joined the challenge!")).toBeVisible();
    }
  });
});
