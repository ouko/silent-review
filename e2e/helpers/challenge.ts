import { type Page, expect } from "@playwright/test";

const DEFAULT_TIMEOUT = 15000;
const NAVIGATION_TIMEOUT = 20000;

interface PerVideoChallenge {
  id: string;
  reviewId: string;
}

interface CreateChallengeResponse {
  challenge: PerVideoChallenge;
}

/**
 * From a reveal screen, click "Challenge a friend" and return the new challenge id.
 *
 * The current implementation creates an open per-video challenge (the opponent is
 * claimed when they open the challenge link). If a friend-picker UI is added later,
 * this helper should be updated to select the first user before returning the id.
 */
export async function createPerVideoChallenge(page: Page, reviewId: string): Promise<string> {
  // Make sure we are on a play round for this review so the reveal/challenge CTA is available.
  const currentUrl = page.url();
  if (!currentUrl.includes(`/play/${reviewId}`)) {
    await page.goto(`/play/${reviewId}`);
    await expect(page.getByText(/Guess the rating/i)).toBeVisible({ timeout: DEFAULT_TIMEOUT });
  }

  const challengeButton = page.getByRole("button", { name: /Challenge a friend/i });
  await expect(challengeButton).toBeVisible({ timeout: DEFAULT_TIMEOUT });

  const createResponse = page.waitForResponse(
    (res) => res.url().includes("/api/challenges/per-video") && res.request().method() === "POST",
    { timeout: DEFAULT_TIMEOUT }
  );
  await challengeButton.click();
  const response = await createResponse;

  const body = (await response.json()) as CreateChallengeResponse;
  const challengeId = body.challenge.id;
  expect(challengeId).toBeTruthy();

  return challengeId;
}

/**
 * Navigate to a challenge landing page and accept it.
 */
export async function acceptChallenge(page: Page, challengeId: string): Promise<void> {
  await page.goto(`/challenge/${challengeId}`);
  await expect(page.getByText(/Head-to-head|Take the challenge/i).first()).toBeVisible({ timeout: DEFAULT_TIMEOUT });

  const playButton = page.getByRole("button", { name: /Take the challenge/i });
  await expect(playButton).toBeVisible({ timeout: DEFAULT_TIMEOUT });
  await playButton.click();

  await expect(page).toHaveURL(new RegExp(`/play/[^/]+\\?challenge=${challengeId}`), { timeout: NAVIGATION_TIMEOUT });
  await expect(page.getByText(/Guess the rating/i)).toBeVisible({ timeout: DEFAULT_TIMEOUT });
}

/**
 * Submit a guess inside a challenge round.
 */
export async function submitChallengeGuess(page: Page, rating: string): Promise<void> {
  const radio = page.getByRole("radio", { name: rating }).first();
  await expect(radio).toBeVisible({ timeout: DEFAULT_TIMEOUT });
  await radio.scrollIntoViewIfNeeded();
  await radio.click({ force: true });
  await expect(radio).toHaveAttribute("aria-checked", "true", { timeout: 5000 });

  const revealButton = page.getByRole("button", { name: /Reveal rating/i });
  await expect(revealButton).toBeEnabled({ timeout: DEFAULT_TIMEOUT });

  const guessResponse = page.waitForResponse(
    (res) => res.url().includes("/api/guesses/") && res.request().method() === "POST",
    { timeout: DEFAULT_TIMEOUT }
  );
  await revealButton.click();
  await guessResponse;

  await expect(page.getByText(/The actual rating was/i)).toBeVisible({ timeout: DEFAULT_TIMEOUT });
}
