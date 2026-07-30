import { test, expect } from "@playwright/test";
import { loginDemoUser } from "./helpers/auth";

test.describe("profile stats navigation", () => {
  test("clicking reviews count selects the reviews tab and scrolls to it", async ({ page }) => {
    await loginDemoUser(page);
    await page.goto("/profile/me");

    await page.getByRole("button", { name: /reviews/i }).click();
    await expect(page.getByRole("tab", { name: /reviews/i })).toHaveAttribute("aria-selected", "true");

    // The page must scroll so the tab bar reaches the top of the scroll area.
    await expect
      .poll(async () =>
        page.evaluate(() => {
          const scroller = document.querySelector("main div.h-full.overflow-y-auto");
          return scroller ? scroller.scrollTop : 0;
        })
      )
      .toBeGreaterThan(0);
  });

  test("clicking the reviews tab scrolls to the review content", async ({ page }) => {
    await loginDemoUser(page);
    await page.goto("/profile/me");

    await page.getByRole("tab", { name: /activity/i }).click();
    await page.evaluate(() => {
      const scroller = document.querySelector("main div.h-full.overflow-y-auto");
      scroller?.scrollTo({ top: 0 });
    });

    await page.getByRole("tab", { name: /reviews/i }).click();
    await expect(page.getByRole("tab", { name: /reviews/i })).toHaveAttribute("aria-selected", "true");
    await expect
      .poll(async () =>
        page.evaluate(() => {
          const scroller = document.querySelector("main div.h-full.overflow-y-auto");
          return scroller ? scroller.scrollTop : 0;
        })
      )
      .toBeGreaterThan(0);
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
