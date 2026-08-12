import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { EmptyState } from "../ui/EmptyState";
import { Skeleton } from "../ui/Skeleton";

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

function useNotifications() {
  return useQuery<{ notifications: Notification[]; unreadCount: number }>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data } = await api.get("/api/notifications");
      return data;
    },
  });
}

function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id?: string) => {
      if (id) {
        await api.post(`/api/notifications/${id}/read`);
      } else {
        await api.post("/api/notifications/read-all");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ActivityFeed() {
  const { data, isLoading } = useNotifications();
  const markRead = useMarkRead();

  return (
    <div className="flex h-full flex-col">
      <div className="safe-top flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="font-heading text-xl font-bold tracking-tight">Activity</h2>
        {!!data?.unreadCount && (
          <button
            onClick={() => markRead.mutate(undefined)}
            className="text-xs font-bold text-primary-400 hover:text-primary-300"
          >
            Mark all read
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {isLoading && (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                <Skeleton circle className="h-10 w-10" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}
        {!isLoading && data?.notifications.length === 0 && (
          <EmptyState emoji="🔔" title="No activity yet" subtitle="Likes, comments, follows, and challenges show up here." />
        )}
        <ul className="space-y-2 p-3" role="list">
          {data?.notifications.map((n) => (
            <li key={n.id}>
              <button
                onClick={() => !n.readAt && markRead.mutate(n.id)}
                disabled={!!n.readAt}
                aria-label={n.readAt ? `Read notification: ${n.title}` : `Mark notification as read: ${n.title}`}
                className={[
                  "flex w-full items-start gap-3 rounded-2xl border border-white/10 p-3 text-left transition-colors",
                  n.readAt ? "bg-white/[0.03] opacity-60" : "bg-white/5 hover:bg-white/[0.07]",
                ].join(" ")}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-500/15 text-primary-300">
                  {n.type === "like" && "❤️"}
                  {n.type === "comment" && "💬"}
                  {n.type === "follow" && "👤"}
                  {n.type === "challenge" && "⚔️"}
                  {!["like", "comment", "follow", "challenge"].includes(n.type) && "🔔"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white">{n.title}</p>
                  <p className="text-sm leading-relaxed text-white/60">{n.body}</p>
                  <p className="mt-1 text-xs font-medium text-white/40">{timeAgo(n.createdAt)}</p>
                </div>
                {!n.readAt && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-500" aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
