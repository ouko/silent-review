import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { login, type AuthProvider, type OAuthProvider } from "../lib/auth";
import { useAuthStore } from "../stores/authStore";
import { formatUserError } from "../lib/errors";
import { AuthLayout } from "../components/auth/AuthLayout";
import { AuthInput } from "../components/auth/AuthInput";
import { AuthButton } from "../components/auth/AuthButton";
import { SocialButton } from "../components/auth/SocialButton";

export function Login() {
  const navigate = useNavigate();
  const { setUser, setAccessToken, setLoading } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setIsLoading] = useState(false);
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
    setIsLoading(true);
    try {
      const { user, accessToken } = await login(email, password);
      setUser(user);
      setAccessToken(accessToken);
      setLoading(false);
      navigate("/");
    } catch (err) {
      setIsLoading(false);
      setError(formatUserError(err));
    }
  }

  async function handleOAuth(provider: OAuthProvider) {
    setError("");
    // OAuth providers require a full redirect flow. The backend must initiate
    // the provider authorization URL and the frontend needs a callback handler.
    // Until that flow is wired end-to-end, show a clear unavailable message.
    setError(`${provider} login is not available in this build.`);
  }

  return (
    <AuthLayout title="Silent Review" subtitle="Guess the rating before the reveal.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthInput
          type="email"
          placeholder="Email"
          aria-label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <AuthInput
          type="password"
          placeholder="Password"
          aria-label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && (
          <motion.p
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: [0, -6, 6, -6, 6, 0] }}
            transition={{ duration: 0.4 }}
            className="text-center text-sm text-red-400"
          >
            {error}
          </motion.p>
        )}

        <AuthButton type="submit" loading={loading}>
          Log in with Email
        </AuthButton>
      </form>

      {oauthProviders.length > 0 && (
        <div className="mt-6 space-y-3">
          <p className="text-center text-xs font-medium uppercase tracking-wide text-white/40">or</p>
          {oauthProviders.map((provider) => (
            <SocialButton key={provider} provider={provider} onClick={() => handleOAuth(provider)} />
          ))}
        </div>
      )}

      <p className="mt-8 text-center text-sm text-white/50">
        Don&apos;t have an account?{" "}
        <a href="/register" className="font-semibold text-rose-400 hover:text-rose-300">
          Sign up
        </a>
      </p>
    </AuthLayout>
  );
}
