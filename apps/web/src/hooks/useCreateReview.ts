import { useMutation, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/authStore";
import { useUpload, type UploadResult } from "./useUpload";
import { generateUUID } from "../lib/uuid";
import { formatUserError } from "../lib/errors";
import type { FeedResponse, FeedReview } from "./useFeed";

interface CreateReviewResponse extends FeedReview {
  status: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  brand?: string | null;
}

export interface ReviewInput {
  productId: string;
  product: Product;
  rating: number;
  caption: string;
  productTag?: string;
  duetOfId?: string | null;
}

interface CreateReviewVariables {
  file: File;
  review: ReviewInput;
}

interface CreateReviewContext {
  previous?: InfiniteData<FeedResponse>;
  tempId: string;
  videoUrl: string;
}

const FEED_QUERY_KEY = ["feed", "for-you", undefined];

export function useCreateReview(options?: { onSuccess?: (review: FeedReview) => void }) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { upload, progress, isUploading, error: uploadError } = useUpload();

  const mutation = useMutation<FeedReview, Error, CreateReviewVariables, CreateReviewContext>({
    mutationFn: async ({ file, review }) => {
      const uploadResult: UploadResult = await upload(file);

      const { data } = await api.post<CreateReviewResponse>("/api/reviews", {
        productId: review.productId,
        videoUrl: uploadResult.url,
        ...(uploadResult.thumbnailUrl ? { thumbnailUrl: uploadResult.thumbnailUrl } : {}),
        duration: uploadResult.duration,
        format: file.type,
        rating: review.rating,
        caption: review.caption,
        ...(review.productTag ? { productTag: review.productTag } : {}),
        ...(review.duetOfId ? { duetOfId: review.duetOfId } : {}),
      });

      if (data.status === "UNDER_REVIEW") {
        const moderation = await waitForModeration(uploadResult.url);
        if (moderation?.status === "REJECT") {
          throw new Error("This video couldn't be uploaded because it may violate community guidelines.");
        }
      }

      return data as FeedReview;
    },
    onMutate: async ({ file, review }) => {
      await queryClient.cancelQueries({ queryKey: FEED_QUERY_KEY });
      const previous = queryClient.getQueryData<InfiniteData<FeedResponse>>(FEED_QUERY_KEY);

      const tempId = generateUUID();
      const videoUrl = URL.createObjectURL(file);

      if (user) {
        const optimistic: FeedReview = {
          id: tempId,
          videoUrl,
          thumbnailUrl: null,
          caption: review.caption || null,
          productTag: review.productTag || null,
          rating: review.rating,
          duration: 5,
          createdAt: new Date().toISOString(),
          user: {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
          },
          product: {
            id: review.product.id,
            name: review.product.name,
            category: review.product.category,
          },
          likeCount: 0,
          guessCount: 0,
          commentCount: 0,
          shareCount: 0,
        };

        queryClient.setQueryData<InfiniteData<FeedResponse>>(FEED_QUERY_KEY, (old) => {
          if (!old) return old;
          const [firstPage, ...rest] = old.pages;
          return {
            ...old,
            pages: [{ ...firstPage, reviews: [optimistic, ...firstPage.reviews] }, ...rest],
            pageParams: old.pageParams,
          };
        });
      }

      return { previous, tempId, videoUrl };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData<InfiniteData<FeedResponse>>(FEED_QUERY_KEY, context.previous);
      }
    },
    onSettled: (_data, _error, _vars, context) => {
      if (context?.videoUrl) {
        URL.revokeObjectURL(context.videoUrl);
      }
      queryClient.invalidateQueries({ queryKey: FEED_QUERY_KEY });
    },
    onSuccess: (data) => {
      options?.onSuccess?.(data);
    },
  });

  const rawError = mutation.error || uploadError;

  return {
    createReview: mutation.mutate,
    isPending: mutation.isPending,
    isUploading,
    progress,
    error: rawError ? new Error(formatUserError(rawError)) : null,
    reset: mutation.reset,
  };
}

async function waitForModeration(
  videoUrl: string,
  maxAttempts = 30
): Promise<{ status: string; reasons?: string[]; score?: number | null } | null> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const { data } = await api.get(`/api/reviews/moderation?videoUrl=${encodeURIComponent(videoUrl)}`);
      if (data.status !== "PENDING") return data;
    } catch {
      return null;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return null;
}
