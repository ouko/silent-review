import { describe, it, expect } from "vitest";
import { buildShareUrl, toHashtagSlug } from "../urlBuilder";

describe("urlBuilder", () => {
  it("builds a UTM-tagged review URL", () => {
    const url = buildShareUrl("abc123", "EcoWear Sneakers", {
      provider: "tiktok",
      baseUrl: "http://localhost:5173",
    });
    expect(url).toBe(
      "http://localhost:5173/review/abc123?utm_source=silentreview&utm_medium=share&utm_campaign=tiktok&utm_content=EcoWearSneakers"
    );
  });

  it("slugifies product names for hashtags", () => {
    expect(toHashtagSlug("EcoWear Sneakers!")).toBe("EcoWearSneakers");
  });

  it("falls back to generic content when product name is empty", () => {
    const url = buildShareUrl("abc123", "", { provider: "copy" });
    expect(url).toContain("utm_content=review");
  });
});
