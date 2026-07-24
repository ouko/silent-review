import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
}

export function Button({ variant = "primary", className = "", children, ...props }: ButtonProps) {
  const base = "inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-bold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50";
  const styles = {
    primary:
      "bg-gradient-to-r from-rose-500 via-pink-500 to-violet-500 text-white shadow-lg shadow-rose-500/20 hover:opacity-90",
    secondary: "bg-white text-black hover:bg-white/90",
    ghost: "border border-white/20 bg-white/5 text-white hover:bg-white/10",
  };
  return (
    <button className={`${base} ${styles[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
