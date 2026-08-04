import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { PlayHome } from "../PlayHome";

vi.mock("../../hooks/useFeed", () => ({
  useFeed: () => ({
    data: {
      pages: [
        {
          reviews: [
            {
              id: "review-1",
              videoUrl: "https://example.com/video.mp4",
              thumbnailUrl: null,
              caption: "Mystery review",
              productTag: "Test Product",
              rating: 7,
              duration: 10,
              createdAt: new Date().toISOString(),
              user: {
                id: "user-1",
                username: "tester",
                displayName: null,
                avatarUrl: null,
              },
              product: { id: "product-1", name: "Test Product", category: "test" },
              likeCount: 0,
              guessCount: 0,
              commentCount: 0,
              shareCount: 0,
            },
          ],
        },
      ],
    },
    isLoading: false,
  }),
}));

vi.mock("../../hooks/useChallenges", () => ({
  useChallenges: () => ({
    discoverChallenges: [],
    isLoading: false,
  }),
}));

vi.mock("../../hooks/useGamification", () => ({
  useGamification: () => ({
    data: {
      streakDays: 1,
      longestStreak: 1,
      totalPoints: 0,
      totalReviews: 0,
      totalGuesses: 0,
      rank: 1,
      totalRanked: 1,
      achievements: [],
    },
    isLoading: false,
  }),
}));

const queryClient = new QueryClient();

describe("PlayHome", () => {
  it("renders the game home", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <PlayHome />
        </BrowserRouter>
      </QueryClientProvider>
    );
    expect(screen.getByText("Daily Drop")).toBeInTheDocument();
  });
});
