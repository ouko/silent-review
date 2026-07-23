import { forwardRef } from "react";
import { motion, useReducedMotion } from "framer-motion";

export const AuthInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => {
    const reducedMotion = useReducedMotion();

    return (
      <motion.input
        ref={ref}
        whileFocus={reducedMotion ? undefined : { scale: 1.02 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={[
          "w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-white placeholder-white/40 outline-none",
          "transition-colors focus:border-rose-500 focus:bg-white/10 focus:ring-2 focus:ring-rose-500/30",
          className,
        ].join(" ")}
        {...(props as React.ComponentPropsWithoutRef<typeof motion.input>)}
      />
    );
  }
);
AuthInput.displayName = "AuthInput";
