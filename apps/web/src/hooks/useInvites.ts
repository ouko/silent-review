import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface Invite {
  id: string;
  code: string;
  link: string;
  clicks: number;
  acceptedAt: string | null;
  createdAt: string;
}

const PAGE_SIZE = 10;

export function useInvites() {
  const queryClient = useQueryClient();

  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useInfiniteQuery<{
    invites: Invite[];
    nextCursor?: string;
  }>({
    queryKey: ["invites"],
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get("/api/invites/me", {
        params: { limit: PAGE_SIZE, cursor: pageParam },
      });
      return data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["invites"] });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/api/invites");
      return data.invite as Invite;
    },
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      await api.delete(`/api/invites/${inviteId}`);
    },
    onSuccess: invalidate,
  });

  return {
    invites: data?.pages.flatMap((page) => page.invites) ?? [],
    isLoading,
    hasMore: Boolean(hasNextPage),
    loadMore: fetchNextPage,
    isLoadingMore: isFetchingNextPage,
    createInvite: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    deleteInvite: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
