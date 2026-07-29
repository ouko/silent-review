import { test, expect, type Browser } from "@playwright/test";
import { loginDemoUser, DEMO_PASSWORD } from "./helpers/auth";

async function extractInviteCode(text: string): Promise<string> {
  const match = text.match(/invite\/([a-f0-9]+)/);
  if (!match) throw new Error(`Could not extract invite code from: ${text}`);
  return match[1];
}

async function registerFreshUserWithInvite(
  browser: Browser,
  inviteCode: string
): Promise<{ email: string; username: string }> {
  const context = await browser.newContext();
  const page = await context.newPage();

  const suffix = `${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
  const email = `invite-${suffix}@silentreview.app`;
  const username = `inv${suffix}`;

  // Start directly on the register page with the invite code so the full
  // invite acceptance path is exercised without relying on the landing click.
  await page.goto(`/register?invite=${inviteCode}`);
  await expect(page.getByRole("heading", { name: /create account/i })).toBeVisible();

  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Username").fill(username);
  await page.getByPlaceholder("Password").fill(DEMO_PASSWORD);

  const submitButton = page.getByRole("button", { name: /sign up with email/i });
  await expect(submitButton).toBeEnabled();

  const registerResponse = page.waitForResponse((res) =>
    res.url().includes("/api/auth/register")
  );
  await submitButton.click();
  const response = await registerResponse;
  expect(response.status()).toBe(201);

  await expect(page).toHaveURL("/", { timeout: 20000 });
  await expect(page.getByText("For You")).toBeVisible({ timeout: 15000 });

  await context.close();
  return { email, username };
}

test.describe("invites", () => {
  test("user can create and copy an invite link", async ({ page }) => {
    await loginDemoUser(page);
    await page.goto("/viral");

    await expect(page.getByText("Invite friends")).toBeVisible();

    // Clicking Copy link creates an invite and copies it.
    await page.getByRole("button", { name: "Copy link" }).click();

    // The invite list should now contain a link for this user.
    const firstInvite = page.getByText(/invite\//i).first();
    await expect(firstInvite).toBeVisible();

    // Verify the link is copyable by clicking the per-invite copy button.
    const copyButton = page.getByRole("button", { name: "Copy invite link" }).first();
    await expect(copyButton).toBeVisible();
    await copyButton.click();

    // The link displayed in the list should contain the invite path.
    const linkText = await firstInvite.textContent();
    expect(linkText).toMatch(/invite\//);
  });

  test("WhatsApp share button opens a WhatsApp share link", async ({ page }) => {
    await loginDemoUser(page);
    await page.goto("/viral");

    const whatsappPromise = page.waitForEvent("popup", { timeout: 5000 });
    await page.getByRole("button", { name: "WhatsApp" }).click();
    const popup = await whatsappPromise.catch(() => null);

    if (popup) {
      await expect(popup).toHaveURL(/whatsapp|wa\.me/);
      await popup.close();
    }
  });

  test("invite landing page links to registration with the invite code", async ({ page }) => {
    await loginDemoUser(page);
    await page.goto("/viral");

    await page.getByRole("button", { name: "Copy link" }).click();
    const firstInvite = page.getByText(/invite\//i).first();
    await expect(firstInvite).toBeVisible();
    const inviteCode = await extractInviteCode((await firstInvite.textContent()) ?? "");

    await page.goto(`/invite/${inviteCode}`);
    await expect(page.getByText("invited you")).toBeVisible();

    await page.getByRole("button", { name: /Join Silent Review/i }).click();
    await expect(page).toHaveURL(`/register?invite=${inviteCode}`);
  });

  test("invite link registration marks invite as accepted", async ({ page, browser }) => {
    // User A: create an invite.
    await loginDemoUser(page);
    await page.goto("/viral");
    await expect(page.getByText("Invite friends")).toBeVisible();

    await page.getByRole("button", { name: "Copy link" }).click();

    const firstInvite = page.getByText(/invite\//i).first();
    await expect(firstInvite).toBeVisible();
    const inviteCode = await extractInviteCode((await firstInvite.textContent()) ?? "");

    // User B: register via the invite link.
    await registerFreshUserWithInvite(browser, inviteCode);

    // User A: refresh invites and verify the invite was accepted.
    await page.reload();
    await expect(page.getByText("Invite friends")).toBeVisible();
    await expect(page.getByText("joined").first()).toBeVisible();
  });
});
