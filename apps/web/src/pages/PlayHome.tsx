import { useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useFeed } from "../hooks/useFeed";
import { useChallenges } from "../hooks/useChallenges";
import { usePlayStore } from "../stores/playStore";
import { StreakHeader } from "../components/play/StreakHeader";
import { DailyDropCard } from "../components/play/DailyDropCard";
import { ChallengeInbox } from "../components/play/ChallengeInbox";
import { ContinuePlaying } from "../components/play/ContinuePlaying";
import { trackEvent } from "../lib/analytics";

const APP_OPEN_TIME_KEY = "sr_app_open_time";
const FIRST_ROUND_TRACKED_KEY = "sr_first_round_tracked";

export function PlayHome() {
  const navigate = useNavigate();
  const { data, isLoading: feedLoading } = useFeed("for-you");
  const { discoverChallenges } = useChallenges();
  const markPlayed = usePlayStore((s) => s.markPlayed);
  const setDailyDrop = usePlayStore((s) => s.setDailyDrop);
  const setPendingChallengeCount = usePlayStore((s) => s.setPendingChallengeCount);
  const isPlayed = usePlayStore((s) => s.isPlayed);
  const playedIds = usePlayStore((s) => s.playedReviewIds);

  const reviews = data?.pages.flatMap((page) => page.reviews) ?? [];

  const { dailyDrop, continueList } = useMemo(() => {
    const firstUnplayed = reviews.find((r) => !isPlayed(r.id));
    const drop = firstUnplayed ?? reviews[0];
    const rest = reviews.filter((r) => r.id !== drop?.id).slice(0, 10);
    return { dailyDrop: drop, continueList: rest };
  }, [reviews, isPlayed]);

  useEffect(() => {
    setDailyDrop(dailyDrop?.id ?? null);
  }, [dailyDrop?.id, setDailyDrop]);

  useEffect(() => {
    setPendingChallengeCount(discoverChallenges.length);
  }, [discoverChallenges.length, setPendingChallengeCount]);

  const appOpenTimeRef = useRef<number | null>(null);
  useEffect(() => {
    const stored = sessionStorage.getItem(APP_OPEN_TIME_KEY);
    appOpenTimeRef.current = stored ? Number(stored) : Date.now();
    if (!stored) {
      sessionStorage.setItem(APP_OPEN_TIME_KEY, String(appOpenTimeRef.current));
    }
  }, []);

  function trackFirstRoundStart() {
    const tracked = sessionStorage.getItem(FIRST_ROUND_TRACKED_KEY);
    if (tracked || appOpenTimeRef.current == null) return;
    const elapsedMs = Date.now() - appOpenTimeRef.current;
    trackEvent("first_round_start_time", { elapsedMs });
    sessionStorage.setItem(FIRST_ROUND_TRACKED_KEY, "1");
  }

  function handlePlay(reviewId: string) {
    trackFirstRoundStart();
    navigate(`/play/${reviewId}`);
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto px-4 pb-6 pt-4" style={{ scrollbarWidth: "none" }}>
      <StreakHeader />

      <section className="space-y-2">
        <DailyDropCard
          review={dailyDrop}
          isPlayed={dailyDrop ? isPlayed(dailyDrop.id) : false}
          onPlay={() => dailyDrop && handlePlay(dailyDrop.id)}
          isLoading={feedLoading}
        />
      </section>

      <ChallengeInbox />

      <ContinuePlaying
        reviews={continueList}
        playedReviewIds={playedIds}
        onSelect={(review) => handlePlay(review.id)}
      />
    </div>
  );
}
