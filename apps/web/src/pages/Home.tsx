import { useState, useRef, useEffect } from "react";
import { useFeed, type FeedType } from "../hooks/useFeed";
import { VideoCard } from "../components/VideoCard";

const TABS: { id: FeedType; label: string }[] = [
  { id: "for-you", label: "For You" },
  { id: "following", label: "Following" },
  { id: "trending", label: "Trending" },
];

export function Home() {
  const [activeTab, setActiveTab] = useState<FeedType>("for-you");
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } = useFeed(activeTab);
  const loaderRef = useRef<HTMLDivElement>(null);

  const reviews = data?.pages.flatMap((page) => page.reviews) ?? [];

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-center gap-4 border-b border-white/10 p-3">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`text-sm font-semibold ${
              activeTab === tab.id ? "text-white" : "text-white/50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="snap-y h-full overflow-y-scroll">
        {status === "pending" ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
          </div>
        ) : (
          <>
            {reviews.map((review) => (
              <VideoCard
                key={review.id}
                id={review.id}
                videoUrl={review.videoUrl}
                caption={review.caption}
                productTag={review.productTag}
                username={review.user.username}
                avatarUrl={review.user.avatarUrl}
                rating={review.rating}
              />
            ))}
            <div ref={loaderRef} className="flex h-20 items-center justify-center">
              {isFetchingNextPage && (
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
            </div>
            {reviews.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
                <p className="text-lg text-white/70">No reviews yet.</p>
                <a href="/record" className="text-brand-500 underline">
                  Be the first to review
                </a>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
