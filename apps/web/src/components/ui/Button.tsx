import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
}

export function Button({ variant = "primary", className = "", children, ...props }: ButtonProps) {
  const base = "inline-flex items-center justify-center rounded-xl px-4 py-3 font-semibold transition";
  const styles = {
    primary: "bg-brand-500 text-white active:bg-brand-600 disabled:opacity-50",
    secondary: "bg-white text-black active:bg-gray-200",
    ghost: "bg-transparent text-white border border-white/20 active:bg-white/10",
  };
  return (
    <button className={`${base} ${styles[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
