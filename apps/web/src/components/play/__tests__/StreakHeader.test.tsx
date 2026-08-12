import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { StreakHeader } from "../StreakHeader";
import * as useGamification from "../../../hooks/useGamification";

vi.mock("../../../hooks/useGamification");

describe("StreakHeader", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders streak and points", () => {
    vi.spyOn(useGamification, "useGamification").mockReturnValue({
      data: {
        streakDays: 5,
        longestStreak: 12,
        totalPoints: 1280,
        totalReviews: 3,
        totalGuesses: 10,
        rank: 4,
        totalRanked: 100,
        achievements: [],
      },
      isLoading: false,
      isError: false,
      isSuccess: true,
      status: "success",
    } as unknown as ReturnType<typeof useGamification.useGamification>);

    render(<StreakHeader />);
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("1,280 pts")).toBeInTheDocument();
  });
});
