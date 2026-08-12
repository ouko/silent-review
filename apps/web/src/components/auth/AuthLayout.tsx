import { motion, useReducedMotion } from "framer-motion";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  const reducedMotion = useReducedMotion();

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-y-auto overflow-x-hidden bg-void p-6">
      <div className="pointer-events-none absolute inset-0 mesh-gradient-hero" />
      <div className="pointer-events-none absolute -top-20 -left-20 h-72 w-72 rounded-full bg-primary-500/20 blur-[80px]" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-accent-pink/15 blur-[80px]" />

      <motion.div
        initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 my-auto w-full max-w-sm rounded-[2rem] border border-white/10 bg-white/[0.06] p-8 shadow-glow backdrop-blur-2xl"
      >
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 via-accent-pink to-accent-cyan text-3xl shadow-glow">
            🤫
          </div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-white">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-white/55">{subtitle}</p>
        </div>
        {children}
      </motion.div>
    </div>
  );
}
