import { motion } from "framer-motion";
import { useInvites } from "../../hooks/useInvites";
import { Share2, Copy, Check, Users } from "lucide-react";

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
    <section className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-white">Invite friends</h2>
          <p className="mt-1 text-sm text-white/60">
            Share Silent Review. Earn points when they sign up.
          </p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-violet-500">
          <Users className="h-5 w-5 text-white" />
        </div>
      </div>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleShare}
        disabled={isCreating}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-violet-500 py-3.5 font-bold text-white shadow-lg shadow-rose-500/20 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Share2 className="h-4 w-4" />
        {isCreating ? "Creating..." : "Share invite link"}
      </motion.button>

      {isLoading ? (
        <p className="mt-4 text-center text-sm text-white/50">Loading invites...</p>
      ) : (
        <div className="mt-4 space-y-2">
          {invites.map((invite) => (
            <div
              key={invite.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5"
            >
              <div className="min-w-0 flex-1 truncate text-sm font-medium text-white/80">
                {invite.link?.replace(/^https?:\/\//, "") ?? invite.code}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white/60">
                  {invite.clicks} clicks
                </span>
                {invite.acceptedAt ? (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                    <Check className="h-3 w-3" />
                    joined
                  </span>
                ) : (
                  <button
                    onClick={() => navigator.clipboard.writeText(invite.link ?? invite.code)}
                    className="rounded-full bg-white/10 p-1.5 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
                    aria-label="Copy invite link"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
