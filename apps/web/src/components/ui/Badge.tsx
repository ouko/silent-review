interface BadgeProps {
  children: React.ReactNode;
  variant?: "primary" | "lime" | "yellow" | "pink" | "cyan" | "ghost";
  size?: "sm" | "md";
  className?: string;
}

export function Badge({ children, variant = "primary", size = "md", className = "" }: BadgeProps) {
  const base = "inline-flex items-center gap-1.5 rounded-full font-bold w-fit";
  const sizes = {
    sm: "px-2.5 py-1 text-xs",
    md: "px-3.5 py-1.5 text-sm",
  };
  const variants = {
    primary: "bg-primary-500/15 text-primary-300 ring-1 ring-primary-500/30",
    lime: "bg-accent-lime/15 text-accent-lime ring-1 ring-accent-lime/30",
    yellow: "bg-accent-yellow/15 text-accent-yellow ring-1 ring-accent-yellow/30",
    pink: "bg-accent-pink/15 text-accent-pink ring-1 ring-accent-pink/30",
    cyan: "bg-accent-cyan/15 text-accent-cyan ring-1 ring-accent-cyan/30",
    ghost: "bg-white/5 text-white/70 ring-1 ring-white/10",
  };

  return (
    <span className={[base, sizes[size], variants[variant], className].join(" ")}>
      {children}
    </span>
  );
}
