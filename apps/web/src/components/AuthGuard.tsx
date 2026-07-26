import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { fetchMe } from "../lib/auth";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { user, isLoading, setUser, setLoading, logout } = useAuthStore();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const controller = new AbortController();
    setLoading(true);

    fetchMe(controller.signal)
      .then((user) => {
        if (mountedRef.current) setUser(user);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        if (mountedRef.current) {
          logout();
          navigate("/login");
        }
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });

    return () => {
      mountedRef.current = false;
      controller.abort();
    };
  }, [navigate, setUser, setLoading, logout]);

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
