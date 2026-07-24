import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Clapperboard } from "lucide-react";

interface DuetRecorderProps {
  reviewId: string;
}

export function DuetRecorder({ reviewId }: DuetRecorderProps) {
  const navigate = useNavigate();

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={() => navigate(`/record?duet=${reviewId}`)}
      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 py-3.5 font-bold text-white transition-colors hover:bg-white/10"
    >
      <Clapperboard className="h-4 w-4" />
      Duet this review
    </motion.button>
  );
}
