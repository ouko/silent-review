import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface CardProps {
  children: ReactNode;
  className?: string;
  glow?: boolean;
  lift?: boolean;
  onClick?: () => void;
}

export function Card({ children, className = "", glow = false, lift = true, onClick }: CardProps) {
  const reducedMotion = useReducedMotion();
  const Component = onClick ? motion.button : motion.div;

  return (
    <Component
      onClick={onClick}
      whileTap={onClick && !reducedMotion ? { scale: 0.98 } : undefined}
      whileHover={lift && !reducedMotion ? { y: -4, boxShadow: "0 12px 48px rgba(139, 92, 246, 0.12)" } : undefined}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={[
        "relative rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-2xl",
        "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/40",
        glow ? "glow-border" : "",
        onClick ? "cursor-pointer text-left" : "",
        className,
      ].join(" ")}
    >
      {children}
    </Component>
  );
}
