import { Award } from "lucide-react";

interface Badge {
  id: string;
  name: string;
  description: string;
  iconUrl: string | null;
}

interface BadgesDisplayProps {
  badges: Badge[];
}

export function BadgesDisplay({ badges }: BadgesDisplayProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {badges.map((badge) => (
        <div key={badge.id} className="rounded-2xl bg-white/5 p-3 text-center">
          {badge.iconUrl ? (
            <img src={badge.iconUrl} alt="" className="mx-auto mb-2 h-10 w-10" />
          ) : (
            <Award className="mx-auto mb-2 h-10 w-10 text-brand-400" />
          )}
          <p className="text-xs font-semibold">{badge.name}</p>
          <p className="mt-1 text-[10px] text-white/50 line-clamp-2">{badge.description}</p>
        </div>
      ))}
    </div>
  );
}
