import { type Page, expect } from "@playwright/test";

export const DEMO_PASSWORD = "DemoPass123!";

function uniqueSuffix(): string {
  // Use a full UUID plus a timestamp to avoid cross-worker collisions when
  // multiple tests register users in parallel. Keep the result alphanumeric
  // and under 23 chars so "e2euser" + suffix stays within the API's 30-char
  // username limit (/^[a-zA-Z0-9_]+$/).
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "")
      : Math.random().toString(36).slice(2, 16) + Math.random().toString(36).slice(2, 16);
  return `${Date.now()}${random}`.slice(0, 22);
}

export async function registerFreshUser(
  page: Page,
  opts: { password?: string } = {}
): Promise<{ email: string; username: string; token: string }> {
  const suffix = uniqueSuffix();
  const email = `e2e-${suffix}@silentreview.app`;
  const username = `e2euser${suffix}`;
  const password = opts.password ?? DEMO_PASSWORD;

  await page.goto("/register");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Username").fill(username);
  await page.getByPlaceholder("Password").fill(password);

  const submitButton = page.getByRole("button", { name: /sign up with email/i });
  await expect(submitButton).toBeEnabled();

  // Wait for the register response before waiting for navigation so slow DB
  // uniqueness checks don't blow the redirect timeout.
  const registerResponse = page.waitForResponse((res) =>
    res.url().includes("/api/auth/register")
  );
  await submitButton.click();
  await registerResponse;

  await expect(page).toHaveURL("/play", { timeout: 30000 });
  // The Daily Drop card renders a skeleton while the query loads; wait for any
  // of its loaded states (scheduled drop or "no drop" message).
  await expect(page.getByText(/Daily Drop|No Daily Drop scheduled/i)).toBeVisible({ timeout: 30000 });

  // Log in via API so callers have a Bearer token for authenticated endpoints.
  const loginRes = await page.context().request.post("/api/auth/login", {
    data: { email, password },
    headers: { "Content-Type": "application/json" },
  });
  await expect(loginRes.ok()).toBeTruthy();
  const loginBody = (await loginRes.json()) as { accessToken: string };

  return { email, username, token: loginBody.accessToken };
}

export async function loginDemoUser(
  page: Page,
  email = "demo@silentreview.app",
  password = DEMO_PASSWORD
): Promise<void> {
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill(password);

  const submitButton = page.getByRole("button", { name: /log in with email/i });
  await expect(submitButton).toBeEnabled();

  const loginResponse = page.waitForResponse((res) =>
    res.url().includes("/api/auth/login")
  );
  await submitButton.click();
  await loginResponse;

  await expect(page).toHaveURL("/play", { timeout: 30000 });

  // Seeded users with streaks may show a streak-at-risk toast that covers the
  // Daily Drop card. Dismiss it if present so later assertions are unblocked.
  const dismissToast = page.getByRole("button", { name: "Dismiss" });
  if (await dismissToast.isVisible().catch(() => false)) {
    await dismissToast.click();
  }

  await expect(page.getByText(/Daily Drop|No Daily Drop scheduled/i)).toBeVisible({ timeout: 30000 });
}
