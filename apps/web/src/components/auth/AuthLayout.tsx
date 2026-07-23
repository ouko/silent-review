import { motion, useReducedMotion } from "framer-motion";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  const reducedMotion = useReducedMotion();

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-black p-6 animate-mesh">
      <motion.div
        initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative z-10 w-full max-w-sm rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur-xl"
      >
        <h1 className="mb-2 text-center text-3xl font-extrabold tracking-tight text-white">
          {title}
        </h1>
        <p className="mb-8 text-center text-sm text-white/60">{subtitle}</p>
        {children}
      </motion.div>
    </div>
  );
}
