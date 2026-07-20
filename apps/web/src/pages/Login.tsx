import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../lib/auth";
import { useAuthStore } from "../stores/authStore";
import { Button } from "../components/ui/Button";

export function Login() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const { user } = await login(email, password);
      setUser(user);
      navigate("/");
    } catch {
      setError("Invalid email or password");
    }
  }

  return (
    <div className="flex h-full flex-col items-center justify-center p-6">
      <h1 className="mb-2 text-3xl font-bold">Silent Review</h1>
      <p className="mb-8 text-white/60">Guess the rating before the reveal.</p>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl bg-white/10 px-4 py-3 text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-brand-500"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl bg-white/10 px-4 py-3 text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-brand-500"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button type="submit" className="w-full">
          Log in
        </Button>
      </form>

      <div className="mt-6 flex w-full max-w-sm flex-col gap-3">
        <Button variant="secondary" onClick={() => (window.location.href = "/api/auth/google")}>
          Continue with Google
        </Button>
        <Button variant="ghost" onClick={() => (window.location.href = "/api/auth/apple")}>
          Continue with Apple
        </Button>
      </div>

      <p className="mt-8 text-sm text-white/50">
        Don&apos;t have an account?{" "}
        <a href="/register" className="text-brand-500">
          Sign up
        </a>
      </p>
    </div>
  );
}
