import { test, expect, type Locator } from "@playwright/test";
import { registerFreshUser } from "./helpers/auth";

test.setTimeout(60000);

async function swipeOnFeed(feed: Locator, direction: "up" | "down") {
  // WebKit can be slow to return layout info; use getBoundingClientRect from
  // inside the page instead of Playwright's boundingBox helper.
  const rect = await feed.evaluate((el) => el.getBoundingClientRect());

  const x = rect.left + rect.width / 2;
  const yStart = direction === "up" ? rect.top + rect.height * 0.7 : rect.top + rect.height * 0.2;
  const yEnd = direction === "up" ? rect.top + rect.height * 0.2 : rect.top + rect.height * 0.7;

  await feed.evaluate(
    (el, { x, yStart, yEnd }) => {
      const createTouch = (y: number) =>
        new Touch({
          identifier: 1,
          target: el,
          clientX: x,
          clientY: y,
        });
      el.dispatchEvent(
        new TouchEvent("touchstart", {
          touches: [createTouch(yStart)],
          changedTouches: [createTouch(yStart)],
          bubbles: true,
        })
      );
      el.dispatchEvent(
        new TouchEvent("touchmove", {
          touches: [createTouch(yEnd)],
          changedTouches: [createTouch(yEnd)],
          bubbles: true,
        })
      );
      el.dispatchEvent(
        new TouchEvent("touchend", {
          touches: [],
          changedTouches: [createTouch(yEnd)],
          bubbles: true,
        })
      );
    },
    { x, yStart, yEnd }
  );
}

test.describe("bottom navigation", () => {
  test.skip(({ browserName }) => browserName === "webkit", "touch emulation not supported on desktop WebKit");

  test("is visible on home and hides/shows with touch swipe", async ({ page }) => {
    // Use a fresh user so this test does not race with onboarding over the demo account.
    await registerFreshUser(page);

    const nav = page.locator("nav").filter({ hasText: "Home" });
    const navWrapper = nav.locator("..");
    const feed = page.locator(".snap-y.snap-mandatory");
    await expect(feed).toBeVisible({ timeout: 10000 });
    await expect(nav).toBeVisible();
    await expect(navWrapper).toHaveCSS("opacity", "1");
    await page.screenshot({ path: "test-results/bottom-nav-visible.png" });

    // Swipe up (finger moves up) => content scrolls down => nav hides.
    await swipeOnFeed(feed, "up");
    await expect(navWrapper).toHaveCSS("opacity", "0", { timeout: 2000 });
    await page.screenshot({ path: "test-results/bottom-nav-hidden.png" });

    // Swipe down (finger moves down) => content scrolls up => nav shows.
    await swipeOnFeed(feed, "down");
    await expect(navWrapper).toHaveCSS("opacity", "1", { timeout: 2000 });
    await expect(nav).toBeVisible();
  });
});
