import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface CommentUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface Comment {
  id: string;
  text: string;
  createdAt: string;
  user: CommentUser;
  replies: Comment[];
}

const MAX_COMMENT_LENGTH = 280;

export function useComments(reviewId?: string) {
  return useQuery<{ comments: Comment[] }>({
    queryKey: ["comments", reviewId],
    queryFn: async () => {
      const { data } = await api.get(`/api/reviews/${reviewId}/comments`);
      return data;
    },
    enabled: !!reviewId,
  });
}

export function usePostComment(reviewId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ text, parentId }: { text: string; parentId?: string }) => {
      if (text.length > MAX_COMMENT_LENGTH) throw new Error("Comment too long");
      const { data } = await api.post(`/api/reviews/${reviewId}/comments`, { text, parentId });
      return data as Comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", reviewId] });
    },
  });
}
