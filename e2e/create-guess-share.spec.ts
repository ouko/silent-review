import { test, expect } from "@playwright/test";
import path from "path";

const DEMO_EMAIL = "demo@silentreview.app";
const ALICE_EMAIL = "alice@silentreview.app";
const DEMO_PASSWORD = "DemoPass123!";

async function login(page, email: string, password: string) {
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill(password);
  await page.getByRole("button", { name: /log in with email/i }).click();
  await expect(page).toHaveURL("/", { timeout: 10000 });
}

async function logout(page) {
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
}

test.describe("create, guess, and share journey", () => {
  test("demo user creates a review, alice guesses and reveals", async ({ page }) => {
    // 1. Create a review as demo user.
    await login(page, DEMO_EMAIL, DEMO_PASSWORD);
    await page.goto("/record");

    // Search and select a seeded product.
    await page.getByPlaceholder("Search products...").fill("Electronics");
    await page.getByText(/Electronics/i).first().click();

    // Upload a short video from the test fixtures.
    const videoPath = path.join(process.cwd(), "uploads", "19084e79-f845-4fc9-88df-246890c9574d.webm");
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(videoPath);

    // Finalize and post.
    await expect(page.getByText(/Your rating/i)).toBeVisible();
    await page.getByRole("slider", { name: /Rating 1 to 10/i }).fill("8");
    await page.getByPlaceholder("Caption (optional)").fill("E2E test review");
    await page.getByRole("button", { name: /Post review/i }).click();

    // Should return to the feed and show the new review.
    await expect(page).toHaveURL("/", { timeout: 15000 });
    await expect(page.getByText("E2E test review")).toBeVisible();

    // Capture the review caption to locate it again as another user.
    const reviewCaption = page.getByText("E2E test review").first();
    await expect(reviewCaption).toBeVisible();

    // 2. Switch to alice and guess on the review.
    await logout(page);
    await login(page, ALICE_EMAIL, DEMO_PASSWORD);

    // The new review may be at the top of the for-you feed.
    await expect(page.getByText("E2E test review")).toBeVisible();

    // Select a rating and reveal.
    await page.getByRole("button", { name: "8" }).first().click();
    await page.getByRole("button", { name: /Reveal/i }).first().click();

    // After reveal, the actual rating and share actions are visible.
    await expect(page.getByText(/The actual rating was/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /Share/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Play again/i })).toBeVisible();
  });
});
