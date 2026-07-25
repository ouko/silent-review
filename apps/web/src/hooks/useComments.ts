import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface CommentUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface CommentReply {
  id: string;
  text: string;
  userId: string;
  reviewId: string;
  parentId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  user: CommentUser;
}

export interface Comment {
  id: string;
  text: string;
  userId: string;
  reviewId: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  user: CommentUser;
  replies: CommentReply[];
}

interface CommentsResponse {
  comments: Comment[];
}

export function useComments(reviewId: string | undefined) {
  return useQuery<CommentsResponse>({
    queryKey: ["comments", reviewId],
    queryFn: async () => {
      const { data } = await api.get(`/api/comments/reviews/${reviewId}/comments`);
      return data;
    },
    enabled: !!reviewId,
  });
}

export function useCreateComment(reviewId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<Comment, Error, { text: string; parentId?: string }>({
    mutationFn: async ({ text, parentId }) => {
      const { data } = await api.post(`/api/comments/reviews/${reviewId}/comments`, {
        text,
        parentId,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", reviewId] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["review", reviewId] });
    },
  });
}

export function useDeleteComment(reviewId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (commentId) => {
      await api.delete(`/api/comments/${commentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", reviewId] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["review", reviewId] });
    },
  });
}
