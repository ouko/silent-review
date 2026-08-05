import { describe, it, expect, beforeEach } from "vitest";
import { usePlayStore } from "../playStore";

describe("playStore", () => {
  beforeEach(() => {
    usePlayStore.setState({
      dailyDropReviewId: null,
      playedReviewIds: [],
      pendingChallengeCount: 0,
    });
  });

  it("marks a review as played", () => {
    usePlayStore.getState().markPlayed("r1");
    expect(usePlayStore.getState().isPlayed("r1")).toBe(true);
    expect(usePlayStore.getState().isPlayed("r2")).toBe(false);
  });

  it("does not duplicate played ids", () => {
    usePlayStore.getState().markPlayed("r1");
    usePlayStore.getState().markPlayed("r1");
    expect(usePlayStore.getState().playedReviewIds).toEqual(["r1"]);
  });

  it("updates pending challenge count", () => {
    usePlayStore.getState().setPendingChallengeCount(3);
    expect(usePlayStore.getState().pendingChallengeCount).toBe(3);
  });
});
