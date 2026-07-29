import { useSearchParams } from "react-router-dom";
import { useEffect, useRef } from "react";
import { InviteFriends } from "../components/viral/InviteFriends";
import { ChallengeList } from "../components/viral/ChallengeCard";
import { QRGenerator } from "../components/viral/QRGenerator";
import { useChallenges } from "../hooks/useChallenges";
import { useUIStore } from "../stores/uiStore";

export function Viral() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { joinChallenge, myChallenges, discoverChallenges } = useChallenges();
  const addToast = useUIStore((s) => s.addToast);
  const processedRef = useRef(false);

  useEffect(() => {
    const joinId = searchParams.get("join");
    if (!joinId || processedRef.current) return;

    const allChallenges = [...myChallenges, ...discoverChallenges];
    const target = allChallenges.find((c) => c.id === joinId);

    if (target && myChallenges.some((c) => c.id === joinId)) {
      addToast("You're already in this challenge!", "info");
      processedRef.current = true;
      searchParams.delete("join");
      setSearchParams(searchParams, { replace: true });
      return;
    }

    if (target) {
      processedRef.current = true;
      joinChallenge(joinId)
        .then(() => {
          addToast(`Joined "${target.name}"!`, "success");
        })
        .catch((err) => {
          const message = err instanceof Error ? err.message : "Could not join challenge";
          addToast(message, "error");
        })
        .finally(() => {
          searchParams.delete("join");
          setSearchParams(searchParams, { replace: true });
        });
    }
  }, [searchParams, myChallenges, discoverChallenges, joinChallenge, addToast, setSearchParams]);

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="px-4 pt-5 pb-2">
        <h1 className="text-center text-2xl font-black tracking-tighter gradient-text">Grow Silent Review</h1>
        <p className="mt-1 text-center text-xs font-bold uppercase tracking-widest text-white/40">
          Invite, challenge, share
        </p>
      </div>

      <div className="space-y-3 p-3 pb-8">
        <InviteFriends />
        <ChallengeList />
        <QRGenerator />
      </div>
    </div>
  );
}
