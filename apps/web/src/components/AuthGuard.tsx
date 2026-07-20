import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { fetchMe } from "../lib/auth";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { user, accessToken, isLoading, setUser, setLoading, logout } = useAuthStore();

  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      navigate("/login");
      return;
    }
    fetchMe()
      .then(setUser)
      .catch(() => {
        logout();
        navigate("/login");
      })
      .finally(() => setLoading(false));
  }, [navigate, accessToken, setUser, setLoading, logout]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;
  return <>{children}</>;
}
