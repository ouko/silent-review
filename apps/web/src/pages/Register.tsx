import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { register, oauthLogin, type AuthProvider, type OAuthProvider } from "../lib/auth";
import { useAuthStore } from "../stores/authStore";
import { Button } from "../components/ui/Button";

const PROVIDER_LABELS: Record<AuthProvider, string> = {
  email: "Email",
  google: "Google",
  apple: "Apple",
  tiktok: "TikTok",
  instagram: "Instagram",
};

export function Register() {
  const navigate = useNavigate();
  const { setUser, setAccessToken, setLoading } = useAuthStore();
  const [form, setForm] = useState({
    email: "",
    username: "",
    password: "",
    displayName: "",
  });
  const [error, setError] = useState("");
  const [providers, setProviders] = useState<AuthProvider[]>(["email"]);

  useEffect(() => {
    fetch("/api/auth/providers")
      .then((res) => res.json())
      .then((data) => {
        const ids = (data.providers ?? []).map((p: { id: string }) => p.id as AuthProvider);
        setProviders(["email", ...ids.filter((id: AuthProvider) => id !== "email")]);
      })
      .catch(() => setProviders(["email"]));
  }, []);

  const oauthProviders = providers.filter((p): p is OAuthProvider => p !== "email");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const { user, accessToken } = await register(form);
      setUser(user);
      setAccessToken(accessToken);
      setLoading(false);
      navigate("/");
    } catch {
      setError("Could not create account. Email or username may be taken.");
    }
  }

  async function handleOAuth(provider: OAuthProvider) {
    setError("");
    try {
      const { user, accessToken } = await oauthLogin(provider, {
        code: "demo-code",
        redirectUri: window.location.origin + "/oauth/callback",
      });
      setUser(user);
      setAccessToken(accessToken);
      setLoading(false);
      navigate("/");
    } catch {
      setError(`${PROVIDER_LABELS[provider]} login is not available.`);
    }
  }

  return (
    <div className="flex h-full flex-col items-center justify-center p-6">
      <h1 className="mb-2 text-3xl font-bold">Create account</h1>
      <p className="mb-8 text-white/60">Join Silent Review and start guessing.</p>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          className="w-full rounded-xl bg-white/10 px-4 py-3 text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-brand-500"
        />
        <input
          type="text"
          placeholder="Username"
          value={form.username}
          onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
          className="w-full rounded-xl bg-white/10 px-4 py-3 text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-brand-500"
        />
        <input
          type="text"
          placeholder="Display name (optional)"
          value={form.displayName}
          onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
          className="w-full rounded-xl bg-white/10 px-4 py-3 text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-brand-500"
        />
        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          className="w-full rounded-xl bg-white/10 px-4 py-3 text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-brand-500"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button type="submit" className="w-full">
          Sign up with Email
        </Button>
      </form>

      <div className="mt-6 flex w-full max-w-sm flex-col gap-3">
        {oauthProviders.map((provider) => (
            <Button
              key={provider}
              variant="secondary"
              onClick={() => handleOAuth(provider)}
              className="w-full"
            >
              Continue with {PROVIDER_LABELS[provider]}
            </Button>
          ))}
      </div>

      <p className="mt-8 text-sm text-white/50">
        Already have an account?{" "}
        <a href="/login" className="text-brand-500">
          Log in
        </a>
      </p>
    </div>
  );
}
