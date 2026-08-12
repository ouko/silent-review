import { forwardRef } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", ...props }, ref) => {
    const reducedMotion = useReducedMotion();

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="text-xs font-medium uppercase tracking-[0.05em] text-white/50">
            {label}
          </label>
        )}
        <motion.input
          ref={ref}
          whileFocus={reducedMotion ? undefined : { scale: 1.01 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className={[
            "input-modern",
            error ? "border-red-400/50 focus:border-red-400" : "",
            className,
          ].join(" ")}
          {...(props as React.ComponentPropsWithoutRef<typeof motion.input>)}
        />
        {error && (
          <p className="text-xs font-medium text-red-400" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";
