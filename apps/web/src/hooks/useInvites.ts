import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface Invite {
  id: string;
  code: string;
  link: string;
  clicks: number;
  acceptedAt: string | null;
  createdAt: string;
}

export function useInvites() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ invites: Invite[] }>({
    queryKey: ["invites"],
    queryFn: async () => {
      const { data } = await api.get("/api/invites/me");
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/api/invites");
      return data.invite as Invite;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invites"] });
    },
  });

  return {
    invites: data?.invites ?? [],
    isLoading,
    createInvite: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
  };
}
