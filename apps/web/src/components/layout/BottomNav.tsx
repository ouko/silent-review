import { Home, PlusCircle, Users, User } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";

const LINKS = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/record", icon: PlusCircle, label: "Create" },
  { to: "/viral", icon: Users, label: "Grow" },
  { to: "/profile/me", icon: User, label: "Profile" },
];

function isLinkActive(pathname: string, to: string): boolean {
  if (to === "/") return pathname === "/";
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

  return (
    <nav
      className="flex items-center justify-around border-t border-white/10 bg-black/60 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur-xl"
      style={{ minHeight: "calc(4.5rem + env(safe-area-inset-bottom))" }}
    >
      {LINKS.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          onClick={(e) => {
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
