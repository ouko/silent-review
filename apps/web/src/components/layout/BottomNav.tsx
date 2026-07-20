import { Home, PlusCircle, Users, User } from "lucide-react";
import { NavLink } from "react-router-dom";

const LINKS = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/record", icon: PlusCircle, label: "Create" },
  { to: "/viral", icon: Users, label: "Grow" },
  { to: "/profile/me", icon: User, label: "Profile" },
];

export function BottomNav() {
  return (
    <nav className="flex h-16 items-center justify-around border-t border-white/10 bg-black/80 backdrop-blur">
      {LINKS.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-xs ${isActive ? "text-brand-500" : "text-white/60"}`
          }
        >
          <link.icon className="h-6 w-6" />
          <span>{link.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
