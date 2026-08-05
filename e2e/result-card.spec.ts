import { test, expect } from "@playwright/test";
import { registerFreshUser } from "./helpers/auth";
import { prepareFeedForTesting, revealFirstReview } from "./create-guess-share.spec";

test.describe("result card share flow", () => {
  test("user can open result card preview after revealing a review", async ({ page }) => {
    await registerFreshUser(page);
    await prepareFeedForTesting(page);

    await revealFirstReview(page, "7");

    const shareCardButton = page.getByRole("button", { name: /Share result card/i });
    await expect(shareCardButton).toBeVisible();
    await shareCardButton.click();

    // The preview modal should open and show the generated card.
    const preview = page.getByRole("dialog", { name: /Share result/i });
    await expect(preview).toBeVisible();
    await expect(preview.getByAltText("Result card preview")).toBeVisible({ timeout: 10000 });

    // The share and copy actions should be present.
    await expect(preview.getByRole("button", { name: /Share/i })).toBeVisible();
    await expect(preview.getByRole("button", { name: /Copy image/i })).toBeVisible();

    // Closing the preview returns to the reveal screen.
    await preview.getByRole("button", { name: /Close share result/i }).click();
    await expect(shareCardButton).toBeVisible();
  });
});
