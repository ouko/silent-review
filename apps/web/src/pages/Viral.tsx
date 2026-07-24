import { InviteFriends } from "../components/viral/InviteFriends";
import { ChallengeList } from "../components/viral/ChallengeCard";
import { QRGenerator } from "../components/viral/QRGenerator";

export function Viral() {
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
