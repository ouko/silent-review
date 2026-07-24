import { Home, PlusCircle, Users, User } from "lucide-react";
import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";

const LINKS = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/record", icon: PlusCircle, label: "Create" },
  { to: "/viral", icon: Users, label: "Grow" },
  { to: "/profile/me", icon: User, label: "Profile" },
];

export function BottomNav() {
  return (
    <nav className="flex h-18 items-center justify-around border-t border-white/10 bg-black/60 px-2 pb-2 pt-1 backdrop-blur-xl">
      {LINKS.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
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
                  className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-r from-rose-500/80 via-pink-500/80 to-violet-500/80"
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
