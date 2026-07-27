import { type Page, expect } from "@playwright/test";

export const DEMO_PASSWORD = "DemoPass123!";

function uniqueSuffix(): string {
  // Use crypto randomness plus a timestamp to avoid cross-worker collisions
  // when multiple tests register users in parallel. Keep the result alphanumeric
  // and under 23 chars so "e2euser" + suffix stays within the API's 30-char
  // username limit (/^[a-zA-Z0-9_]+$/).
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 8)
      : Math.random().toString(36).slice(2, 8);
  return `${Date.now()}${random}`;
}

export async function registerFreshUser(
  page: Page,
  opts: { password?: string } = {}
): Promise<{ email: string; username: string }> {
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

  await expect(page).toHaveURL("/", { timeout: 20000 });
  await expect(page.getByText("For You")).toBeVisible({ timeout: 15000 });

  return { email, username };
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

  await expect(page).toHaveURL("/", { timeout: 20000 });
  await expect(page.getByText("For You")).toBeVisible();
}
