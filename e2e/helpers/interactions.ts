import { type Page, expect } from "@playwright/test";

const DEFAULT_TIMEOUT = 15000;

function reviewScope(page: Page, reviewId?: string) {
  return reviewId ? page.locator(`[data-review-id="${reviewId}"]`).first() : page;
}

/**
 * Like the first visible review or a specific review. Asserts the button becomes Unlike.
 */
export async function likeReview(page: Page, reviewId?: string): Promise<void> {
  if (reviewId) {
    await page.goto(`/review/${reviewId}`);
  }

  const scope = reviewScope(page, reviewId);
  const likeButton = scope.getByRole("button", { name: /^Like review/i }).first();
  await expect(likeButton).toBeVisible({ timeout: DEFAULT_TIMEOUT });
  await expect(likeButton).toBeEnabled({ timeout: DEFAULT_TIMEOUT });

  const likeResponse = page.waitForResponse(
    (res) => res.url().includes(`/api/likes/reviews/${reviewId ?? ""}`) && res.request().method() === "POST",
    { timeout: DEFAULT_TIMEOUT }
  );
  await likeButton.click();
  await likeResponse;

  await expect(scope.getByRole("button", { name: /^Unlike review/i }).first()).toBeVisible({ timeout: DEFAULT_TIMEOUT });
}

/**
 * Post a comment on the first visible review or a specific review.
 */
export async function commentOnReview(page: Page, text: string, reviewId?: string): Promise<void> {
  if (reviewId) {
    await page.goto(`/review/${reviewId}`);
  }

  const scope = reviewScope(page, reviewId);
  const commentInput = scope.locator('input[aria-label="Add a comment"]').first();
  await expect(commentInput).toBeVisible({ timeout: DEFAULT_TIMEOUT });
  await commentInput.fill(text);

  const postButton = scope.getByRole("button", { name: /Post comment/i }).first();
  await expect(postButton).toBeEnabled({ timeout: DEFAULT_TIMEOUT });

  const commentResponse = page.waitForResponse(
    (res) => res.url().includes(`/api/comments/reviews/${reviewId ?? ""}/comments`) && res.request().method() === "POST",
    { timeout: DEFAULT_TIMEOUT }
  );
  await postButton.click();
  await commentResponse;

  await expect(page.getByText(text).first()).toBeVisible({ timeout: DEFAULT_TIMEOUT });
}

/**
 * Navigate to a user's profile and follow them.
 */
export async function followUser(page: Page, userId: string): Promise<void> {
  await page.goto(`/profile/${userId}`);
  await expect(page.locator(`[data-profile-username]`)).toBeVisible({ timeout: DEFAULT_TIMEOUT });

  const followButton = page.getByRole("button", { name: /^Follow user/i });
  await expect(followButton).toBeVisible({ timeout: DEFAULT_TIMEOUT });
  await followButton.click();

  await expect(page.getByRole("button", { name: /^Unfollow user/i })).toBeVisible({ timeout: DEFAULT_TIMEOUT });
}

/**
 * Navigate to a user's profile and unfollow them.
 */
export async function unfollowUser(page: Page, userId: string): Promise<void> {
  await page.goto(`/profile/${userId}`);
  await expect(page.locator(`[data-profile-username]`)).toBeVisible({ timeout: DEFAULT_TIMEOUT });

  const unfollowButton = page.getByRole("button", { name: /^Unfollow user/i });
  await expect(unfollowButton).toBeVisible({ timeout: DEFAULT_TIMEOUT });
  await unfollowButton.click();

  await expect(page.getByRole("button", { name: /^Follow user/i })).toBeVisible({ timeout: DEFAULT_TIMEOUT });
}
