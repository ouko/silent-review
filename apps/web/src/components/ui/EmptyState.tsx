import { motion, useReducedMotion } from "framer-motion";

interface EmptyStateProps {
  icon?: React.ReactNode;
  emoji?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, emoji, title, subtitle, action }: EmptyStateProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={reducedMotion ? {} : { opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="flex flex-col items-center justify-center px-6 py-12 text-center"
    >
      <div className="relative mb-6">
        <div className="absolute -inset-6 rounded-full mesh-gradient opacity-40 blur-2xl" />
        <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl glass text-4xl">
          {emoji ? <span aria-hidden="true">{emoji}</span> : icon}
        </div>
      </div>
      <h3 className="font-heading text-2xl font-bold tracking-tight">{title}</h3>
      {subtitle && <p className="mt-2 max-w-xs text-sm leading-relaxed text-white/50">{subtitle}</p>}
      {action && <div className="mt-6">{action}</div>}
    </motion.div>
  );
}
