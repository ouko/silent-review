import { motion } from "framer-motion";
import { useInvites } from "../../hooks/useInvites";
import { Share2, Copy, Check, Users, MessageCircle, Mail } from "lucide-react";
import { useState } from "react";
import { useUIStore } from "../../stores/uiStore";

export function InviteFriends() {
  const { invites, isLoading, createInvite, isCreating } = useInvites();
  const addToast = useUIStore((s) => s.addToast);
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);

  async function ensureInvite(): Promise<{ link: string; code: string } | null> {
    if (lastInviteLink) {
      const existing = invites.find((i) => i.link === lastInviteLink);
      if (existing) return { link: existing.link, code: existing.code };
    }
    try {
      const invite = await createInvite();
      setLastInviteLink(invite.link);
      return { link: invite.link, code: invite.code };
    } catch {
      addToast("Could not create invite link. Try again.", "error");
      return null;
    }
  }

  async function handleNativeShare() {
    const invite = await ensureInvite();
    if (!invite) return;
    const shareData = {
      title: "Join me on Silent Review",
      text: "Guess the rating of silent 5-second reviews. Join me here:",
      url: invite.link,
    };
    if (navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // User cancelled or sharing failed — fall through to clipboard.
      }
    }
    await copyToClipboard(invite.link);
  }

  async function handleWhatsAppShare() {
    const invite = await ensureInvite();
    if (!invite) return;
    const text = encodeURIComponent(`Join me on Silent Review — guess the rating of silent 5-second reviews: ${invite.link}`);
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  }

  async function handleSMSShare() {
    const invite = await ensureInvite();
    if (!invite) return;
    const body = encodeURIComponent(`Join me on Silent Review: ${invite.link}`);
    window.location.href = `sms:?body=${body}`;
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      addToast("Invite link copied to clipboard", "success");
    } catch {
      addToast("Could not copy link", "error");
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

      <div className="mt-4 grid grid-cols-2 gap-2">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleNativeShare}
          disabled={isCreating}
          className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-violet-500 py-3.5 font-bold text-white shadow-lg shadow-rose-500/20 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Share2 className="h-4 w-4" />
          {isCreating ? "Creating..." : "Share"}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={async () => {
            const invite = await ensureInvite();
            if (invite) await copyToClipboard(invite.link);
          }}
          disabled={isCreating}
          className="flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 py-3.5 font-bold text-white transition-colors hover:bg-white/10 disabled:opacity-50"
        >
          <Copy className="h-4 w-4" />
          {isCreating ? "Creating..." : "Copy link"}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleWhatsAppShare}
          disabled={isCreating}
          className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500/20 py-3 text-sm font-bold text-emerald-300 transition-colors hover:bg-emerald-500/30 disabled:opacity-50"
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleSMSShare}
          disabled={isCreating}
          className="flex items-center justify-center gap-2 rounded-2xl bg-blue-500/20 py-3 text-sm font-bold text-blue-300 transition-colors hover:bg-blue-500/30 disabled:opacity-50"
        >
          <Mail className="h-4 w-4" />
          SMS
        </motion.button>
      </div>

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
                    onClick={() => invite.link && copyToClipboard(invite.link)}
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
