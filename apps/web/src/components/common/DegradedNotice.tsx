interface DegradedNoticeProps {
  feature?: string;
  message?: string;
}

export function DegradedNotice({
  feature,
  message = "This feature is temporarily unavailable. We're working on it.",
}: DegradedNoticeProps) {
  return (
    <div className="rounded-xl bg-yellow-500/10 p-4 text-center text-yellow-400">
      <p className="text-sm font-medium">{message}</p>
      {feature && <p className="mt-1 text-xs text-yellow-400/70">Feature: {feature}</p>}
    </div>
  );
}
