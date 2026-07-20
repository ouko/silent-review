import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { Button } from "../components/ui/Button";

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
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center p-6 text-center">
      <h1 className="mb-2 text-3xl font-bold">Silent Review</h1>
      <p className="mb-6 text-white/60">
        {error || `${inviter} invited you to guess ratings of silent 5-second reviews.`}
      </p>
      <Button onClick={() => navigate(`/register?invite=${code}`)} className="w-full max-w-sm">
        Join Silent Review
      </Button>
      <p className="mt-4 text-sm text-white/50">
        Already have an account?{" "}
        <a href={`/login?invite=${code}`} className="text-brand-500">
          Log in
        </a>
      </p>
    </div>
  );
}
