import { test, expect } from "@playwright/test";
import {
  loginAsAdmin,
  approveFirstPendingReview,
  viewContentQueue,
  viewMetricsDashboard,
} from "./helpers/admin";

test.describe.configure({ mode: "serial" });

test.describe("admin workflows", () => {
  // Admin panel navigation and queue hydration can be slow under concurrent test load,
  // so give these end-to-end flows more time than the default 60s.
  test.setTimeout(120000);

  test.skip(({ browserName }) => browserName === "webkit", "desktop WebKit emulator is too flaky for this flow");

  test("admin can log in, approve a pending review, and see the pending count drop", async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Admin" })).toBeVisible({ timeout: 15000 });

    // Capture the pending-moderation count shown in the stats card before acting.
    const pendingLabel = page.getByText("Pending");
    await expect(pendingLabel).toBeVisible({ timeout: 15000 });
    const pendingValueText = await pendingLabel
      .locator("xpath=preceding-sibling::p")
      .textContent({ timeout: 5000 });
    const initialPending = parseInt(pendingValueText ?? "0", 10);

    await approveFirstPendingReview(page);

    // If there were pending items, the stats card should refresh with a lower count.
    if (initialPending > 0) {
      await expect(async () => {
        const currentText = await pendingLabel
          .locator("xpath=preceding-sibling::p")
          .textContent({ timeout: 5000 });
        const currentPending = parseInt(currentText ?? "0", 10);
        expect(currentPending).toBeLessThan(initialPending);
      }).toPass({ timeout: 15000 });
    } else {
      // Queue was already empty; helper should have surfaced the empty state.
      await expect(page.getByText("Queue is clear")).toBeVisible({ timeout: 15000 });
    }
  });

  test("admin can view the content queue with rows", async ({ page }) => {
    await loginAsAdmin(page);
    await viewContentQueue(page);
  });

  test("admin can view the metrics dashboard with metric cards and funnel", async ({ page }) => {
    await loginAsAdmin(page);
    await viewMetricsDashboard(page);
  });
});
