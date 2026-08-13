import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { useFeed } from "../hooks/useFeed";
import { useTodaysDailyDrop } from "../hooks/useDailyDrop";
import { useChallenges } from "../hooks/useChallenges";
import { usePlayStore } from "../stores/playStore";
import { useAuthStore } from "../stores/authStore";
import { usePrefetchFeed } from "../hooks/usePrefetchFeed";
import { preloadBrowse } from "../lib/routePreload";
import { StreakHeader } from "../components/play/StreakHeader";
import { DailyDropCard } from "../components/play/DailyDropCard";
import { ChallengeInbox } from "../components/play/ChallengeInbox";
import { ContinuePlaying } from "../components/play/ContinuePlaying";
import { trackEvent } from "../lib/analytics";

const APP_OPEN_TIME_KEY = "sr_app_open_time";
const FIRST_ROUND_TRACKED_KEY = "sr_first_round_tracked";

export function PlayHome() {
  const navigate = useNavigate();
  const { data: feedData } = useFeed("for-you");
  const { data: dailyDropData, isLoading: dailyDropLoading } = useTodaysDailyDrop();
  const { discoverChallenges } = useChallenges();
  const setDailyDrop = usePlayStore((s) => s.setDailyDrop);
  const setPendingChallengeCount = usePlayStore((s) => s.setPendingChallengeCount);
  const playedIds = usePlayStore((s) => s.playedReviewIds);
  const user = useAuthStore((s) => s.user);
  const reducedMotion = useReducedMotion();
  usePrefetchFeed();

  const reviews = feedData?.pages.flatMap((page) => page.reviews) ?? [];
  const continueList = reviews.filter((r) => r.id !== dailyDropData?.dailyDrop.review.id).slice(0, 10);

  useEffect(() => {
    setDailyDrop(dailyDropData?.dailyDrop.review.id ?? null);
  }, [dailyDropData?.dailyDrop.review.id, setDailyDrop]);

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
    preloadBrowse();
  }, []);

  function trackFirstRoundStart() {
    const tracked = sessionStorage.getItem(FIRST_ROUND_TRACKED_KEY);
    if (tracked || appOpenTimeRef.current == null) return;
    const elapsedMs = Date.now() - appOpenTimeRef.current;
    trackEvent("first_round_start_time", { elapsedMs });
    sessionStorage.setItem(FIRST_ROUND_TRACKED_KEY, "1");
  }

  function handlePlayDailyDrop() {
    trackFirstRoundStart();
    navigate("/dailydrop");
  }

  function handlePlay(reviewId: string) {
    trackFirstRoundStart();
    navigate(`/play/${reviewId}`);
  }

  const greetingName = user?.displayName ?? user?.username ?? "there";

  return (
    <div
      className="flex h-full flex-col gap-4 overflow-y-auto px-4 pb-6 pt-4 no-scrollbar"
      style={{ scrollbarWidth: "none" }}
    >
      <motion.div
        initial={reducedMotion ? {} : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        <p className="text-sm font-medium text-white/50">Hey {greetingName} 👋</p>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-white">
          Ready to <span className="gradient-text">guess?</span>
        </h1>
      </motion.div>

      <StreakHeader />

      <section className="space-y-2">
        <DailyDropCard
          dailyDrop={dailyDropData?.dailyDrop}
          alreadyGuessed={dailyDropData?.alreadyGuessed}
          onPlay={handlePlayDailyDrop}
          isLoading={dailyDropLoading}
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
