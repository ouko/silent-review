import { Gamepad2, Compass, PlusCircle, Bell, User } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useRef } from "react";
import { trackEvent } from "../../lib/analytics";

const LINKS = [
  { to: "/play", icon: Gamepad2, label: "Play" },
  { to: "/browse", icon: Compass, label: "Browse", preload: () => import("../../pages/Home").catch(() => {}) },
  { to: "/record", icon: PlusCircle, label: "Create" },
  { to: "/activity", icon: Bell, label: "Activity" },
  { to: "/profile/me", icon: User, label: "Profile" },
];

function isLinkActive(pathname: string, to: string): boolean {
  if (to === "/play") return pathname === "/play" || pathname.startsWith("/play/");
  if (to === "/profile/me") return pathname.startsWith("/profile");
  return pathname.startsWith(to);
}

function scrollPageToTop() {
  const main = document.querySelector("main");
  const scrollables = main?.querySelectorAll<HTMLElement>("*") ?? [];
  for (const el of scrollables) {
    if (el.scrollHeight > el.clientHeight && el.clientHeight > 0) {
      el.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

export function BottomNav() {
  const location = useLocation();
  const previousPathRef = useRef(location.pathname);

  function handleNavClick(to: string) {
    const from = previousPathRef.current;
    if (to !== from) {
      trackEvent("tab_switched", { from, to });
      previousPathRef.current = to;
    }
  }

  return (
    <nav
      className="flex items-center justify-around border-t border-white/10 bg-black/60 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur-xl"
      style={{ minHeight: "calc(4.5rem + env(safe-area-inset-bottom))" }}
    >
      {LINKS.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          onMouseEnter={link.preload}
          onTouchStart={link.preload}
          onClick={(e) => {
            handleNavClick(link.to);
            if (isLinkActive(location.pathname, link.to)) {
              // Already on this page: give feedback instead of a no-op.
              e.preventDefault();
              scrollPageToTop();
            }
          }}
          className={({ isActive }) =>
            `group relative flex flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-xs font-bold transition-colors ${
              isActive ? "text-white" : "text-white/50 hover:text-white/80"
            }`
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="pointer-events-none absolute inset-0 -z-10 rounded-2xl bg-gradient-to-r from-rose-500/80 via-pink-500/80 to-violet-500/80"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <link.icon className={`h-6 w-6 transition-transform ${isActive ? "scale-110" : "group-active:scale-95"}`} />
              <span>{link.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
