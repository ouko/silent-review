import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFeed } from "../useFeed";
import { api } from "../../lib/api";

vi.mock("../../lib/api", () => ({
  api: { get: vi.fn() },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useFeed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps previous data when switching tabs", async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: { reviews: [{ id: "r1" }] } })
      .mockResolvedValueOnce({ data: { reviews: [{ id: "r2" }] } });

    const { result, rerender } = renderHook(
      ({ tab }: { tab: "for-you" | "trending" }) => useFeed(tab),
      {
        wrapper,
        initialProps: { tab: "for-you" },
      }
    );

    await waitFor(() => expect(result.current.data?.pages[0].reviews).toHaveLength(1));
    rerender({ tab: "trending" });

    expect(result.current.data?.pages[0].reviews[0].id).toBe("r1");
    await waitFor(() => expect(result.current.data?.pages[0].reviews[0].id).toBe("r2"));
  });
});
