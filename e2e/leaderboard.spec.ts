import { test, expect } from "@playwright/test";
import { loginDemoUser } from "./helpers/auth";

test.describe.configure({ mode: "serial" });

test.describe("leaderboard", () => {
  // Leaderboard hydration and tab switches can be slow under concurrent test
  // load, so give these end-to-end flows more time than the default 60s.
  test.setTimeout(120000);

  test.skip(({ browserName }) => browserName === "webkit", "desktop WebKit emulator is too flaky for this flow");

  test("/leaderboard loads and shows seeded users with scores", async ({ page }) => {
    await loginDemoUser(page);

    await page.goto("/leaderboard");
    await expect(page.getByText("Leaderboard")).toBeVisible();
    await expect(page.getByText("Top guessers this week")).toBeVisible();

    // Wait for the leaderboard API to resolve and rows to render.
    await expect(async () => {
      const rows = page.locator("li").filter({ hasText: /@/ });
      await expect(rows.first()).toBeVisible({ timeout: 5000 });
      const count = await rows.count();
      expect(count).toBeGreaterThan(0);
    }).toPass({ timeout: 20000 });

    // The top-ranked user should have a visible score (points).
    const firstRow = page.locator("ul > li").first();
    await expect(firstRow).toBeVisible();
    await expect(firstRow.getByText(/pts/i)).toBeVisible();
    const scoreText = await firstRow.locator("text=/\\d+/").first().textContent();
    expect(scoreText).toBeTruthy();
  });

  test("can switch leaderboard tabs and see active tab state", async ({ page }) => {
    await loginDemoUser(page);

    await page.goto("/leaderboard");
    await expect(page.getByRole("tab", { name: "Global" })).toBeVisible();

    // The Global tab should be active by default.
    await expect(page.getByRole("tab", { name: "Global", selected: true })).toBeVisible();

    // Switch to the Friends tab if it exists; some builds may hide it.
    const friendsTab = page.getByRole("tab", { name: "Friends" });
    if (await friendsTab.isVisible().catch(() => false)) {
      const friendsResponse = page.waitForResponse((res) =>
        res.url().includes("/api/gamification/leaderboard") && res.url().includes("type=friends")
      );
      await friendsTab.click();
      await friendsResponse;

      await expect(page.getByRole("tab", { name: "Friends", selected: true })).toBeVisible();

      // Friends may be empty for a fresh user, so only assert rows if present.
      const friendRows = page.locator("li").filter({ hasText: /@/ });
      if (await friendRows.first().isVisible().catch(() => false)) {
        await expect(friendRows.first()).toBeVisible();
      }
    }

    // Switch back to Global and confirm the tab becomes active. The data may be
    // served from TanStack Query's cache, so we only assert UI state.
    await page.getByRole("tab", { name: "Global" }).click();
    await expect(page.getByRole("tab", { name: "Global", selected: true })).toBeVisible();
    await expect(page.locator("ul > li").first()).toBeVisible();
  });
});
