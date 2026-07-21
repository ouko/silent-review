import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { ProfileData } from "./useProfile";

export function useFollow(userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (following: boolean) => {
      if (following) {
        await api.delete(`/api/follows/${userId}`);
      } else {
        await api.post(`/api/follows/${userId}`);
      }
      return !following;
    },
    onMutate: async (following) => {
      if (!userId) return;
      await queryClient.cancelQueries({ queryKey: ["profile", userId] });
      const previous = queryClient.getQueryData<ProfileData>(["profile", userId]);
      if (previous) {
        queryClient.setQueryData<ProfileData>(["profile", userId], {
          ...previous,
          isFollowing: !following,
          followerCount: previous.followerCount + (following ? -1 : 1),
        });
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous && userId) {
        queryClient.setQueryData(["profile", userId], context.previous);
      }
    },
  });
}
