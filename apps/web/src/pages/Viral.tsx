import { InviteFriends } from "../components/viral/InviteFriends";
import { ChallengeList } from "../components/viral/ChallengeCard";
import { QRGenerator } from "../components/viral/QRGenerator";

export function Viral() {
  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <h1 className="p-4 text-2xl font-bold">Grow Silent Review</h1>
      <InviteFriends />
      <ChallengeList />
      <QRGenerator />
    </div>
  );
}
