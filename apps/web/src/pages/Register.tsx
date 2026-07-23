import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { register, oauthLogin, type AuthProvider, type OAuthProvider } from "../lib/auth";
import { useAuthStore } from "../stores/authStore";
import { AuthLayout } from "../components/auth/AuthLayout";
import { AuthInput } from "../components/auth/AuthInput";
import { AuthButton } from "../components/auth/AuthButton";
import { SocialButton } from "../components/auth/SocialButton";

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
  const [isLoading, setIsLoading] = useState(false);
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
      const { user, accessToken } = await register(form);
      setUser(user);
      setAccessToken(accessToken);
      setLoading(false);
      navigate("/");
    } catch {
      setIsLoading(false);
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
      setError(`${provider} login is not available.`);
    }
  }

  return (
    <AuthLayout title="Create account" subtitle="Join Silent Review and start guessing.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthInput
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          required
        />
        <AuthInput
          type="text"
          placeholder="Username"
          value={form.username}
          onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
          required
        />
        <AuthInput
          type="text"
          placeholder="Display name (optional)"
          value={form.displayName}
          onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
        />
        <AuthInput
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
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

        <AuthButton type="submit" loading={isLoading}>
          Sign up with Email
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
        Already have an account?{" "}
        <a href="/login" className="font-semibold text-rose-400 hover:text-rose-300">
          Log in
        </a>
      </p>
    </AuthLayout>
  );
}
