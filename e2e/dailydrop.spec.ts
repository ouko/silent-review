import { test, expect } from "@playwright/test";
import { registerFreshUser } from "./helpers/auth";
import { startDailyDrop, submitDailyDropGuess, revealDailyDrop } from "./helpers/dailydrop";

test.describe.configure({ mode: "serial" });

test.describe("Daily Drop", () => {
  test.setTimeout(120000);

  test.skip(({ browserName }) => browserName === "webkit", "desktop WebKit emulator is too flaky for this flow");

  test("logged-in user sees the Daily Drop card on /play", async ({ page }) => {
    await registerFreshUser(page);

    await page.goto("/play");
    await expect(page.getByText("Daily Drop").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: /Play today's guess/i })).toBeVisible({ timeout: 15000 });
  });

  test("user can start the Daily Drop, submit a guess, reveal the rating, and open the result card", async ({ page }) => {
    await registerFreshUser(page);

    await startDailyDrop(page);
    await submitDailyDropGuess(page, "6");
    await revealDailyDrop(page);
  });

  test("a second attempt at the same Daily Drop is rejected", async ({ page, browser }) => {
    await registerFreshUser(page);

    await startDailyDrop(page);
    await submitDailyDropGuess(page, "5");

    await expect(page.getByText(/The actual rating was/i)).toBeVisible({ timeout: 15000 });

    // Reuse the authenticated browser context to call the Daily Drop attempt API directly.
    const context = page.context();
    const todayRes = await context.request.get("/api/dailydrop/today");
    await expect(todayRes.ok()).toBeTruthy();
    const todayBody = (await todayRes.json()) as { dailyDrop: { id: string } };

    const secondAttemptRes = await context.request.post(`/api/dailydrop/${todayBody.dailyDrop.id}/attempt`, {
      data: { guessedRating: 5 },
      headers: { "Content-Type": "application/json" },
    });

    await expect(secondAttemptRes.ok()).toBeFalsy();
    expect(secondAttemptRes.status()).toBeGreaterThanOrEqual(400);
    expect(secondAttemptRes.status()).toBeLessThan(500);

    // The UI should still show the reveal state rather than restarting the round.
    await expect(page.getByText(/The actual rating was/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: /Reveal rating/i })).not.toBeVisible();
  });
});
