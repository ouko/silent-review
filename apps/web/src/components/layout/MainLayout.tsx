import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";
import { BottomNav } from "./BottomNav";
import { ToastContainer } from "../common/Toast";
import { useUIStore } from "../../stores/uiStore";
import { useAuthStore } from "../../stores/authStore";
import { initAnalytics, setAnalyticsUser, trackEvent } from "../../lib/analytics";

export function MainLayout() {
  const showBottomNav = useUIStore((s) => s.showBottomNav);
  const setShowBottomNav = useUIStore((s) => s.setShowBottomNav);
  const location = useLocation();
  const reducedMotion = useReducedMotion();
  const user = useAuthStore((s) => s.user);
  const openedRef = useRef(false);

  useEffect(() => {
    initAnalytics(user?.id);
    if (!openedRef.current) {
      openedRef.current = true;
      trackEvent("app_open", { path: location.pathname });
    }
  }, []);

  useEffect(() => {
    setAnalyticsUser(user?.id ?? null);
  }, [user?.id]);

  useEffect(() => {
    setShowBottomNav(true);
  }, [location.pathname, setShowBottomNav]);

  const hideNavOnAuth = location.pathname === "/login" || location.pathname === "/register";
  const shouldShowNav = showBottomNav && !hideNavOnAuth;

  return (
    <div className="flex h-dvh flex-col bg-black text-white">
      <main className="relative flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={reducedMotion ? {} : { opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reducedMotion ? {} : { opacity: 0, scale: 1.01 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="h-full w-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <motion.div
        initial={false}
        animate={{
          y: shouldShowNav ? 0 : "100%",
          opacity: shouldShowNav ? 1 : 0,
        }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="z-50 will-change-transform"
      >
        <BottomNav />
      </motion.div>
      <ToastContainer />
    </div>
  );
}
