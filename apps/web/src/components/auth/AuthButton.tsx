import { motion, useReducedMotion } from "framer-motion";

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
      whileTap={reducedMotion ? undefined : { scale: 0.98 }}
      disabled={props.disabled || loading}
      className={[
        "flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-violet-500 px-4 py-3.5 font-semibold text-white shadow-lg shadow-rose-500/20",
        "transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60",
        className,
      ].join(" ")}
      {...(props as React.ComponentPropsWithoutRef<typeof motion.button>)}
    >
      {loading ? (
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      ) : (
        children
      )}
    </motion.button>
  );
}
