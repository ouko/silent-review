import { Gamepad2, Compass, PlusCircle, Bell, User } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import { trackEvent } from "../../lib/analytics";
import { preloadBrowse } from "../../router";

const LINKS = [
  { to: "/play", icon: Gamepad2, label: "Play" },
  { to: "/browse", icon: Compass, label: "Browse" },
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
  const reducedMotion = useReducedMotion();

  function handleNavClick(to: string) {
    const from = previousPathRef.current;
    if (to !== from) {
      trackEvent("tab_switched", { from, to });
      previousPathRef.current = to;
    }
  }

  return (
    <nav
      className="flex items-center justify-around border-t border-white/8 bg-void/80 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-2xl"
      style={{ minHeight: "calc(4.5rem + env(safe-area-inset-bottom))" }}
    >
      {LINKS.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          onMouseEnter={link.to === "/browse" ? preloadBrowse : undefined}
          onTouchStart={link.to === "/browse" ? preloadBrowse : undefined}
          onClick={(e) => {
            handleNavClick(link.to);
            if (isLinkActive(location.pathname, link.to)) {
              e.preventDefault();
              scrollPageToTop();
            }
          }}
          className={({ isActive }) =>
            `group relative flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-2 text-[11px] font-medium transition-colors tap-48 ${
              isActive ? "text-primary-300" : "text-white/45 hover:text-white/80"
            }`
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <motion.div
                  layoutId="bottomNavPill"
                  className="pointer-events-none absolute inset-x-2 inset-y-1 -z-10 rounded-2xl bg-primary-500/15"
                  transition={{ type: "spring", stiffness: 450, damping: 32 }}
                />
              )}
              <motion.div
                animate={isActive && !reducedMotion ? { scale: 1.1 } : { scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <link.icon
                  className="h-6 w-6 transition-transform group-active:scale-95"
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </motion.div>
              <span className={isActive ? "font-semibold" : ""}>{link.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
