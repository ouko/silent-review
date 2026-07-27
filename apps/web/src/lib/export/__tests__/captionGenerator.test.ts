import { describe, it, expect } from "vitest";
import { generateCaption } from "../captionGenerator";

describe("generateCaption", () => {
  it("includes product-specific hashtag", () => {
    const result = generateCaption("EcoWear Sneakers", "tiktok", 8);
    expect(result.hashtags).toContain("#EcoWearSneakers");
    expect(result.hashtags).toContain("#SilentReview");
    expect(result.hashtags).toContain("#ProductReview");
  });

  it("falls back to generic product hashtag when name is empty", () => {
    const result = generateCaption("", "tiktok");
    expect(result.hashtags).toContain("#ProductReview");
  });

  it("uses Twitter mention on Twitter platform", () => {
    const result = generateCaption("Test", "twitter");
    expect(result.mentions).toBe("@silentreview");
  });
});
