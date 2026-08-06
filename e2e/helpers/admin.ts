import { type Page, expect } from "@playwright/test";

const DEFAULT_TIMEOUT = 15000;
const NAVIGATION_TIMEOUT = 20000;

const ADMIN_EMAIL = "demo@silentreview.app";
const ADMIN_PASSWORD = "DemoPass123!";

/**
 * Log in as the demo admin and assert we land on /play.
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(ADMIN_EMAIL);
  await page.getByPlaceholder("Password").fill(ADMIN_PASSWORD);

  const submitButton = page.getByRole("button", { name: /log in with email/i });
  await expect(submitButton).toBeEnabled();

  const loginResponse = page.waitForResponse((res) =>
    res.url().includes("/api/auth/login")
  );
  await submitButton.click();
  await loginResponse;

  await expect(page).toHaveURL("/play", { timeout: NAVIGATION_TIMEOUT });
  await expect(page.getByText("Daily Drop")).toBeVisible({ timeout: DEFAULT_TIMEOUT });
}

/**
 * Open the Admin page and switch to the requested tab.
 * The app only exposes /admin, so we navigate there and click the tab.
 */
async function openAdminTab(page: Page, tabName: string): Promise<void> {
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Admin" })).toBeVisible({ timeout: DEFAULT_TIMEOUT });

  const tab = page.getByRole("tab", { name: tabName });
  await expect(tab).toBeVisible({ timeout: DEFAULT_TIMEOUT });
  await tab.click();
  await expect(tab).toHaveAttribute("aria-selected", "true", { timeout: DEFAULT_TIMEOUT });
}

/**
 * Navigate to the moderation queue and approve the first pending review.
 */
export async function approveFirstPendingReview(page: Page): Promise<void> {
  await openAdminTab(page, "Moderation");

  // Wait for the moderation queue API to settle before deciding whether the queue is empty.
  const moderationResponse = page.waitForResponse(
    (res) => res.url().includes("/api/admin/moderation") && res.request().method() === "GET",
    { timeout: DEFAULT_TIMEOUT }
  );
  await moderationResponse;
  // Give React a tick to render the settled state.
  await page.waitForTimeout(200);

  const initialCount = await page.getByRole("button", { name: "Approve" }).count();
  if (initialCount === 0) {
    // Nothing to approve; treat as success.
    await expect(page.getByText("Queue is clear")).toBeVisible({ timeout: DEFAULT_TIMEOUT });
    return;
  }

  const firstApproveButton = page.getByRole("button", { name: "Approve" }).first();
  await expect(firstApproveButton).toBeVisible({ timeout: DEFAULT_TIMEOUT });

  const approveResponse = page.waitForResponse(
    (res) => res.url().includes("/api/admin/moderation") && res.request().method() === "POST",
    { timeout: DEFAULT_TIMEOUT }
  );
  await firstApproveButton.click();
  await approveResponse;

  // After approval the card is removed from the queue.
  await expect.poll(
    async () => page.getByRole("button", { name: "Approve" }).count(),
    { timeout: DEFAULT_TIMEOUT }
  ).toBeLessThan(initialCount);
}

/**
 * Navigate to the content queue and wait for rows to load.
 */
export async function viewContentQueue(page: Page): Promise<void> {
  await openAdminTab(page, "Content Queue");
  await expect(page.getByRole("heading", { name: "Content Queue" })).toBeVisible({ timeout: DEFAULT_TIMEOUT });

  // Wait for either curated rows or the empty-state prompt.
  await expect(
    page.getByText(/No curated reviews yet|Find more candidates|Score:/i).first()
  ).toBeVisible({ timeout: DEFAULT_TIMEOUT });
}

/**
 * Navigate to the metrics dashboard and wait for it to render.
 */
export async function viewMetricsDashboard(page: Page): Promise<void> {
  await openAdminTab(page, "Metrics");
  await expect(page.getByRole("heading", { name: "Metrics" })).toBeVisible({ timeout: DEFAULT_TIMEOUT });

  // The dashboard renders metric cards and the funnel section.
  await expect(page.getByText(/K-factor|Share rate|Streak establishment|Latest D7 retention/i).first())
    .toBeVisible({ timeout: DEFAULT_TIMEOUT });
  await expect(page.getByText("Funnel")).toBeVisible({ timeout: DEFAULT_TIMEOUT });
}
