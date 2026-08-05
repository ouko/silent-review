import { Bell } from "lucide-react";

export function Activity() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-white/5">
        <Bell className="h-8 w-8 text-white/30" />
      </div>
      <h1 className="text-xl font-black text-white">Activity</h1>
      <p className="mt-2 max-w-xs text-sm font-medium text-white/50">
        Notifications, challenge updates, and friend activity will appear here soon.
      </p>
    </div>
  );
}
