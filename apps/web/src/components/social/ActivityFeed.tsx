import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { Loader2 } from "lucide-react";

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

export function ActivityFeed() {
  const { data, isLoading } = useNotifications();
  const markRead = useMarkRead();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/10 p-4">
        <h2 className="text-lg font-bold">Activity</h2>
        {!!data?.unreadCount && (
          <button
            onClick={() => markRead.mutate(undefined)}
            className="text-xs font-medium text-brand-400"
          >
            Mark all read
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-white/70" />
          </div>
        )}
        {!isLoading && data?.notifications.length === 0 && (
          <p className="py-12 text-center text-sm text-white/50">No activity yet.</p>
        )}
        <ul className="divide-y divide-white/5">
          {data?.notifications.map((n) => (
            <li
              key={n.id}
              onClick={() => !n.readAt && markRead.mutate(n.id)}
              className={`cursor-pointer p-4 transition-colors ${
                n.readAt ? "opacity-60" : "bg-white/5"
              }`}
            >
              <p className="text-sm font-semibold">{n.title}</p>
              <p className="text-sm text-white/70">{n.body}</p>
              <p className="mt-1 text-xs text-white/40">
                {new Date(n.createdAt).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
