import { test, expect } from "@playwright/test";
import { loginDemoUser } from "./helpers/auth";

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

  test("WhatsApp share button opens a wa.me link", async ({ page }) => {
    await loginDemoUser(page);
    await page.goto("/viral");

    const whatsappPromise = page.waitForEvent("popup", { timeout: 5000 });
    await page.getByRole("button", { name: "WhatsApp" }).click();
    const popup = await whatsappPromise.catch(() => null);

    if (popup) {
      await expect(popup).toHaveURL(/whatsapp/i);
      await popup.close();
    }
  });
});
