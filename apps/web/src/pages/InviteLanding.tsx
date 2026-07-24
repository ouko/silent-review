import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../lib/api";
import { Button } from "../components/ui/Button";
import { BrandSpinner } from "../components/ui/BrandSpinner";
import { Mail, Sparkles } from "lucide-react";

export function InviteLanding() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inviter, setInviter] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    api
      .get(`/api/invites/${code}`)
      .then(() => {
        // The backend tracks clicks and redirects; this page is the landing experience.
        setInviter("a friend");
      })
      .catch(() => setError("Invalid invite link"))
      .finally(() => setLoading(false));
  }, [code]);

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <BrandSpinner size="lg" />
        <p className="text-sm text-white/50">Loading invite...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 250, damping: 20 }}
        className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-rose-500 to-violet-500 shadow-lg shadow-rose-500/20"
      >
        <Mail className="h-8 w-8 text-white" />
      </motion.div>

      <h1 className="mt-5 text-3xl font-black tracking-tighter gradient-text">Silent Review</h1>
      <p className="mt-2 max-w-xs text-white/60">
        {error || `${inviter} invited you to guess ratings of silent 5-second reviews.`}
      </p>

      <Button onClick={() => navigate(`/register?invite=${code}`)} className="mt-6 w-full max-w-sm">
        <Sparkles className="mr-2 h-4 w-4" />
        Join Silent Review
      </Button>
      <p className="mt-4 text-sm text-white/50">
        Already have an account?{" "}
        <a href={`/login?invite=${code}`} className="font-bold text-rose-400 hover:text-rose-300">
          Log in
        </a>
      </p>
    </div>
  );
}
