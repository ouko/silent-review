import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { register } from "../lib/auth";
import { useAuthStore } from "../stores/authStore";
import { Button } from "../components/ui/Button";

export function Register() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const [form, setForm] = useState({
    email: "",
    username: "",
    password: "",
    displayName: "",
  });
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const { user } = await register(form);
      setUser(user);
      navigate("/");
    } catch {
      setError("Could not create account. Email or username may be taken.");
    }
  }

  return (
    <div className="flex h-full flex-col items-center justify-center p-6">
      <h1 className="mb-8 text-3xl font-bold">Create account</h1>
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
          Sign up
        </Button>
      </form>
      <p className="mt-8 text-sm text-white/50">
        Already have an account?{" "}
        <a href="/login" className="text-brand-500">
          Log in
        </a>
      </p>
    </div>
  );
}
