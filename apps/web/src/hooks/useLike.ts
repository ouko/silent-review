import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useLikeStatus(reviewId?: string) {
  return useQuery<{ liked: boolean; count: number }>({
    queryKey: ["like", reviewId],
    queryFn: async () => {
      const { data } = await api.get(`/api/likes/reviews/${reviewId}`);
      return data;
    },
    enabled: !!reviewId,
  });
}

export function useToggleLike(reviewId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/api/likes/reviews/${reviewId}`);
      return data as { liked: boolean; count: number };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["like", reviewId] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["profile-reviews"] });
    },
  });
}
