import { test, expect } from "@playwright/test";
import { registerFreshUser } from "./helpers/auth";
import { generateVideoFixture } from "./helpers/fixtures";

test.describe("video moderation", () => {
  async function createProductAndUpload(page: any, videoPath: string) {
    await page.goto("/record");

    // Step 1: add a product.
    await page.getByRole("button", { name: /Add new product/i }).click();
    await page.getByPlaceholder("Product name").fill("E2E Test Product");
    await page.getByRole("button", { name: /Add Product/i }).click();

    // Step 2: upload the prepared video from the gallery.
    const fileInput = page.locator('input[type="file"][accept="video/*"]').first();
    await fileInput.setInputFiles(videoPath);

    // Wait for the finalize step to render the preview video.
    await expect(page.locator("video").first()).toBeVisible({ timeout: 10000 });
  }

  test("valid silent 720p video uploads successfully", async ({ page }) => {
    await registerFreshUser(page);
    const videoPath = await generateVideoFixture("valid", {
      width: 1280,
      height: 720,
      filter: "testsrc=duration=5:size=1280x720:rate=30",
    });

    await createProductAndUpload(page, videoPath);

    await page.getByRole("button", { name: /Post review/i }).click();
    await expect(page).toHaveURL(/\/review\//, { timeout: 60000 });
  });

  test("video with audio is rejected", async ({ page }) => {
    await registerFreshUser(page);
    const videoPath = await generateVideoFixture("with-audio", {
      audio: true,
      filter: "testsrc=duration=5:size=640x480:rate=30",
    });

    await createProductAndUpload(page, videoPath);

    await page.getByRole("button", { name: /Post review/i }).click();
    await expect(page.getByText(/must be silent/i)).toBeVisible({ timeout: 30000 });
  });

  test("240p video is rejected for low resolution", async ({ page }) => {
    await registerFreshUser(page);
    const videoPath = await generateVideoFixture("lowres", {
      width: 320,
      height: 240,
      filter: "testsrc=duration=5:size=320x240:rate=30",
    });

    await createProductAndUpload(page, videoPath);

    await page.getByRole("button", { name: /Post review/i }).click();
    await expect(page.getByText(/resolution/i)).toBeVisible({ timeout: 30000 });
  });

  test("mostly skin-toned video is rejected by moderation", async ({ page }) => {
    await registerFreshUser(page);
    const videoPath = await generateVideoFixture("skin", {
      filter: "color=c=#e0ac69:s=640x480:d=5,noise=alls=30:allf=t+u",
    });

    await createProductAndUpload(page, videoPath);

    await page.getByRole("button", { name: /Post review/i }).click();
    await expect(page.getByText(/community guidelines/i)).toBeVisible({ timeout: 60000 });
  });
});
