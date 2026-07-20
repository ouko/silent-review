import { useInvites } from "../../hooks/useInvites";
import { Button } from "../ui/Button";

export function InviteFriends() {
  const { invites, isLoading, createInvite, isCreating } = useInvites();

  async function handleShare() {
    const invite = await createInvite();
    const shareData = {
      title: "Join me on Silent Review",
      text: "Guess the rating of silent 5-second reviews.",
      url: invite.link,
    };
    if (navigator.canShare?.(shareData)) {
      await navigator.share(shareData);
    } else {
      await navigator.clipboard.writeText(invite.link);
      alert("Invite link copied to clipboard!");
    }
  }

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-xl font-bold">Invite friends</h2>
      <p className="text-white/60">
        Share Silent Review with friends. You&apos;ll earn points when they sign up.
      </p>
      <Button onClick={handleShare} disabled={isCreating} className="w-full">
        {isCreating ? "Creating..." : "Share invite link"}
      </Button>

      {isLoading ? (
        <p className="text-sm text-white/50">Loading invites...</p>
      ) : (
        <div className="space-y-2">
          {invites.map((invite) => (
            <div
              key={invite.id}
              className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3"
            >
              <div className="truncate text-sm">{invite.link}</div>
              <div className="text-xs text-white/50">
                {invite.clicks} clicks {invite.acceptedAt && "• joined"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
