import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BottomNav } from "./BottomNav";
import { ToastContainer } from "../common/Toast";
import { useUIStore } from "../../stores/uiStore";

export function MainLayout() {
  const showBottomNav = useUIStore((s) => s.showBottomNav);
  const location = useLocation();
  const reducedMotion = useReducedMotion();

  return (
    <div className="flex h-screen flex-col bg-black text-white">
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
      {showBottomNav && <BottomNav />}
      <ToastContainer />
    </div>
  );
}
