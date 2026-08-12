import { Skeleton } from "../ui/Skeleton";

export function Loading() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
      <Skeleton circle className="h-16 w-16" />
      <Skeleton className="h-4 w-32" />
    </div>
  );
}
