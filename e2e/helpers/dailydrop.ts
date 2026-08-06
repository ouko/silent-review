import { type Page, expect } from "@playwright/test";

const DEFAULT_TIMEOUT = 15000;
const NAVIGATION_TIMEOUT = 20000;

/**
 * From /play, tap the Daily Drop card and wait for the player to load.
 */
export async function startDailyDrop(page: Page): Promise<void> {
  await page.goto("/play");
  await expect(page.getByText("Daily Drop").first()).toBeVisible({ timeout: DEFAULT_TIMEOUT });

  const playButton = page.getByRole("button", { name: /Play today's guess/i });
  await expect(playButton).toBeVisible({ timeout: DEFAULT_TIMEOUT });
  await playButton.click();

  await expect(page).toHaveURL("/dailydrop", { timeout: NAVIGATION_TIMEOUT });
  await expect(page.getByText(/Guess the rating/i)).toBeVisible({ timeout: DEFAULT_TIMEOUT });
}

/**
 * Select a rating radio and submit the Daily Drop guess.
 */
export async function submitDailyDropGuess(page: Page, rating: string): Promise<void> {
  // The Daily Drop player uses AnimatePresence to swap guess/reveal panes, so
  // the rating radio can detach while we interact with it. Retry the whole
  // selection sequence until it sticks.
  await expect(async () => {
    const radio = page.getByRole("radio", { name: rating }).first();
    await expect(radio).toBeVisible();
    await radio.scrollIntoViewIfNeeded();
    await radio.click({ force: true });
    await expect(radio).toHaveAttribute("aria-checked", "true");
  }).toPass({ timeout: 10000 });

  const revealButton = page.getByRole("button", { name: /Reveal rating/i });
  await expect(revealButton).toBeEnabled({ timeout: DEFAULT_TIMEOUT });

  const attemptResponse = page.waitForResponse(
    (res) => res.url().includes("/api/dailydrop") && res.request().method() === "POST",
    { timeout: DEFAULT_TIMEOUT }
  );
  await revealButton.click();
  await attemptResponse;

  await expect(page.getByText(/The actual rating was/i)).toBeVisible({ timeout: DEFAULT_TIMEOUT });
}

/**
 * Open the share result card from the Daily Drop reveal screen.
 */
export async function revealDailyDrop(page: Page): Promise<void> {
  const shareButton = page.getByRole("button", { name: /Share result/i });
  await expect(shareButton).toBeVisible({ timeout: DEFAULT_TIMEOUT });
  await shareButton.click();

  // ResultCardPreview renders a modal with share actions.
  await expect(page.getByText("Share result").first()).toBeVisible({ timeout: DEFAULT_TIMEOUT });
  await expect(page.getByRole("button", { name: /Copy image/i })).toBeVisible({ timeout: DEFAULT_TIMEOUT });
}
