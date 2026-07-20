import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { api } from "../lib/api";
import { VideoCard } from "../components/VideoCard";

interface ReviewDetailData {
  id: string;
  videoUrl: string;
  caption: string | null;
  productTag: string | null;
  rating: number;
  user: { id: string; username: string; displayName: string | null; avatarUrl: string | null };
  viewerGuess: { guessedRating: number } | null;
  counts: { likes: number; comments: number; guesses: number };
}

export function ReviewDetail() {
  const { id } = useParams<{ id: string }>();
  const [review, setReview] = useState<ReviewDetailData | null>(null);
  const [revealed, setRevealed] = useState(false);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);

  useEffect(() => {
    if (!id) return;
    api.get(`/api/reviews/${id}`).then((res) => setReview(res.data));

    const socket = io(import.meta.env.VITE_API_URL ?? "");
    socketRef.current = socket;
    socket.emit("review:join", id);
    socket.on("review:revealed", () => setRevealed(true));

    return () => {
      socket.emit("review:leave", id);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [id]);

  if (!review || !id) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
      </div>
    );
  }

  return (
    <VideoCard
      id={review.id}
      videoUrl={review.videoUrl}
      caption={review.caption}
      productTag={review.productTag}
      username={review.user.username}
      avatarUrl={review.user.avatarUrl}
      revealed={revealed || !!review.viewerGuess}
      rating={review.rating}
      onReveal={async (guess) => {
        try {
          await api.post(`/api/reviews/${id}/guess`, { guessedRating: guess });
        } catch {
          // ignore guess errors; still reveal
        }
        socketRef.current?.emit("review:reveal", id);
      }}
    />
  );
}
