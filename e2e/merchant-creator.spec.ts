import { test, expect, type BrowserContext } from "@playwright/test";
import { loginDemoUser, DEMO_PASSWORD } from "./helpers/auth";
import { loginAsAdmin, viewMetricsDashboard } from "./helpers/admin";

const DEFAULT_TIMEOUT = 15000;

// Seeded demo users from packages/database/prisma/seed.ts.
// roleForIndex: index 0 -> ADMIN, 1-3 -> MERCHANT, 4-8 -> CREATOR.
const ADMIN_EMAIL = "demo@silentreview.app";
const MERCHANT_EMAIL = "alice@silentreview.app";
const CREATOR_EMAIL = "sofia@silentreview.app";

async function apiLogin(context: BrowserContext, email: string, password: string) {
  const res = await context.request.post("/api/auth/login", {
    data: { email, password },
    headers: { "Content-Type": "application/json" },
  });
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as { accessToken: string };
  return body.accessToken;
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

test.describe("merchant and creator analytics workflow", () => {
  // Analytics hydration and admin dashboard rendering can be slow under load,
  // so give these end-to-end flows more time than the default 60s.
  test.setTimeout(120000);

  test.skip(({ browserName }) => browserName === "webkit", "desktop WebKit emulator is too flaky for this flow");

  test("creator can log in and view profile and content stats", async ({ page }) => {
    await loginDemoUser(page, CREATOR_EMAIL, DEMO_PASSWORD);

    await page.goto("/profile/me");
    await expect(page.locator("[data-profile-username]")).toBeVisible({ timeout: DEFAULT_TIMEOUT });

    // The profile stat grid shows review count; individual reviews show likes/comments.
    const reviewsStat = page.locator("text=Reviews").first();
    await expect(reviewsStat).toBeVisible({ timeout: DEFAULT_TIMEOUT });

    // Navigate to the analytics page from the profile CTA.
    const analyticsLink = page.getByRole("link", { name: /Analytics/i });
    await expect(analyticsLink).toBeVisible({ timeout: DEFAULT_TIMEOUT });
    await analyticsLink.click();
    await expect(page).toHaveURL("/analytics", { timeout: 20000 });

    // Creator tab is selected by default and renders content stats.
    await expect(page.getByRole("tab", { name: /Creator/i })).toHaveAttribute("aria-selected", "true", { timeout: DEFAULT_TIMEOUT });
    await expect(page.getByText("Reviews").first()).toBeVisible({ timeout: DEFAULT_TIMEOUT });
    await expect(page.getByText("Guesses").first()).toBeVisible({ timeout: DEFAULT_TIMEOUT });
    await expect(page.getByText(/Last 14 days/i)).toBeVisible({ timeout: DEFAULT_TIMEOUT });
  });

  test("merchant can log in and view owned products and product analytics", async ({ page }) => {
    await loginDemoUser(page, MERCHANT_EMAIL, DEMO_PASSWORD);

    await page.goto("/analytics");
    await expect(page.getByText("Analytics").first()).toBeVisible({ timeout: DEFAULT_TIMEOUT });

    // Switch to the Products tab.
    const productsTab = page.getByRole("tab", { name: /Products/i });
    await expect(productsTab).toBeVisible({ timeout: DEFAULT_TIMEOUT });
    await productsTab.click();
    await expect(productsTab).toHaveAttribute("aria-selected", "true", { timeout: DEFAULT_TIMEOUT });

    // Seeded merchants own ~50 products, so "Your products" should list rows.
    const yourProductsHeading = page.getByText(/Your products/i);
    await expect(yourProductsHeading).toBeVisible({ timeout: DEFAULT_TIMEOUT });
    const firstProduct = yourProductsHeading.locator("xpath=../button[1]");
    await expect(firstProduct).toBeVisible({ timeout: DEFAULT_TIMEOUT });

    // Open the first owned product and verify merchant analytics render.
    const productName = await firstProduct.locator("p").first().textContent();
    expect(productName).toBeTruthy();
    await firstProduct.click();

    await expect(page.getByText(productName!).first()).toBeVisible({ timeout: DEFAULT_TIMEOUT });
    await expect(page.getByText(/Reviews|Avg rating/i).first()).toBeVisible({ timeout: DEFAULT_TIMEOUT });
    await expect(page.getByText("Guesses").first()).toBeVisible({ timeout: DEFAULT_TIMEOUT });
  });

  test("admin metrics dashboard is visible to admin and hidden from non-admins", async ({ page, browser }) => {
    // Admin can open the metrics dashboard through the UI.
    await loginAsAdmin(page);
    await viewMetricsDashboard(page);

    // Non-admin users should not see an Admin link on their own profile.
    const creatorContext = await browser.newContext();
    const creatorPage = await creatorContext.newPage();
    await loginDemoUser(creatorPage, CREATOR_EMAIL, DEMO_PASSWORD);
    await creatorPage.goto("/profile/me");
    await expect(creatorPage.locator("[data-profile-username]")).toBeVisible({ timeout: DEFAULT_TIMEOUT });

    const analyticsLink = creatorPage.getByRole("link", { name: /Analytics/i });
    await expect(analyticsLink).toBeVisible({ timeout: DEFAULT_TIMEOUT });
    await expect(creatorPage.getByRole("link", { name: /Admin/i })).not.toBeVisible();

    // The admin-only analytics API should reject non-admin tokens with 403.
    const creatorToken = await apiLogin(creatorContext, CREATOR_EMAIL, DEMO_PASSWORD);
    const forbiddenRes = await creatorContext.request.get("/api/analytics/dashboard?days=30", {
      headers: authHeaders(creatorToken),
    });
    expect(forbiddenRes.status()).toBe(403);

    await creatorContext.close();
  });
});
