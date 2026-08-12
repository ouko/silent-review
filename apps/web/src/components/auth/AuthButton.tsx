import { motion, useReducedMotion } from "framer-motion";
import { Loader2 } from "lucide-react";

interface AuthButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
}

export function AuthButton({
  loading = false,
  children,
  className = "",
  ...props
}: AuthButtonProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.button
      type="button"
      whileTap={reducedMotion || loading ? undefined : { scale: 0.96 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      disabled={props.disabled || loading}
      className={[
        "flex w-full min-h-14 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-3.5",
        "text-base font-bold text-white shadow-glow transition-shadow hover:shadow-glow-lg active:brightness-105",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      ].join(" ")}
      {...(props as React.ComponentPropsWithoutRef<typeof motion.button>)}
    >
      {loading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : children}
    </motion.button>
  );
}
