import type { ButtonHTMLAttributes, ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Loader2 } from "lucide-react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "glass" | "lime";
  size?: "sm" | "md" | "lg";
  shape?: "pill" | "rounded";
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  shape = "rounded",
  loading = false,
  icon,
  className = "",
  children,
  disabled,
  ...props
}: ButtonProps) {
  const reducedMotion = useReducedMotion();

  const base = [
    "relative inline-flex items-center justify-center gap-2 overflow-hidden font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/50",
    "disabled:cursor-not-allowed disabled:opacity-50",
  ];

  const sizes = {
    sm: "min-h-10 px-4 py-2 text-sm",
    md: "min-h-14 px-6 py-3.5 text-base",
    lg: "min-h-16 px-8 py-4 text-lg",
  };

  const shapes = {
    pill: "rounded-full",
    rounded: "rounded-2xl",
  };

  const variants = {
    primary: [
      "bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-glow",
      "hover:shadow-glow-lg active:brightness-105",
    ],
    secondary: [
      "bg-accent-pink text-white shadow-glow-pink",
      "hover:brightness-110 active:brightness-105",
    ],
    lime: [
      "bg-accent-lime text-black shadow-glow-lime",
      "hover:brightness-105 active:brightness-100",
    ],
    ghost: [
      "border border-white/15 bg-white/5 text-white",
      "hover:bg-white/10 active:bg-white/[0.12]",
    ],
    glass: [
      "glass text-white",
      "hover:bg-white/[0.08] active:bg-white/[0.10]",
    ],
  };

  const classes = [...base, sizes[size], shapes[shape], ...variants[variant], className].join(" ");

  return (
    <motion.button
      whileTap={reducedMotion || disabled || loading ? undefined : { scale: 0.96 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading}
      {...(props as React.ComponentPropsWithoutRef<typeof motion.button>)}
    >
      {loading && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
      {!loading && icon}
      <span className="relative z-10">{children}</span>
      {!disabled && !loading && variant === "primary" && (
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 transition-opacity hover:opacity-100" />
      )}
    </motion.button>
  );
}
