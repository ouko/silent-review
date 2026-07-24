import { motion, useReducedMotion } from "framer-motion";

interface FeedTab {
  id: string;
  label: string;
}

interface FeedTabsProps {
  tabs: FeedTab[];
  activeId: string;
  onSelect: (id: string) => void;
}

export function FeedTabs({ tabs, activeId, onSelect }: FeedTabsProps) {
  const reducedMotion = useReducedMotion();

  return (
    <div className="flex items-center justify-center p-3">
      <div className="relative flex items-center rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur-md">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            className="relative z-10 px-4 py-2 text-sm font-bold tracking-tight transition-colors"
            aria-pressed={activeId === tab.id}
          >
            {activeId === tab.id ? (
              <span className="text-white">{tab.label}</span>
            ) : (
              <span className="text-white/50 hover:text-white/80">{tab.label}</span>
            )}
            {activeId === tab.id && (
              <motion.div
                layoutId="activeFeedTab"
                transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 30 }}
                className="absolute inset-0 -z-10 rounded-full bg-white/15"
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
