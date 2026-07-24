import { BrandSpinner } from "../ui/BrandSpinner";

export function Loading() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3">
      <BrandSpinner size="lg" />
      <p className="text-sm font-medium text-white/50">Loading...</p>
    </div>
  );
}
