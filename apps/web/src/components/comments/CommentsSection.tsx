import { useState } from "react";
import { Send, Trash2 } from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import { useComments, useCreateComment, useDeleteComment, type Comment } from "../../hooks/useComments";
import { Loading } from "../common/Loading";

interface CommentsSectionProps {
  reviewId: string;
}

export function CommentsSection({ reviewId }: CommentsSectionProps) {
  const { data, isLoading } = useComments(reviewId);
  const create = useCreateComment(reviewId);
  const remove = useDeleteComment(reviewId);
  const user = useAuthStore((s) => s.user);
  const [text, setText] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    await create.mutateAsync({ text: text.trim() });
    setText("");
  }

  if (isLoading) return <Loading />;

  const comments = data?.comments ?? [];

  return (
    <div className="border-t border-white/10 bg-black/40 p-4">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-widest text-white/60">
        Comments ({comments.length})
      </h3>

      {user ? (
        <form onSubmit={handleSubmit} className="mb-4 flex items-center gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={280}
            placeholder="Add a comment..."
            className="flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-rose-400/50 focus:bg-white/10 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!text.trim() || create.isPending}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500 text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            aria-label="Post comment"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      ) : (
        <p className="mb-4 text-sm text-white/50">Log in to add a comment.</p>
      )}

      <div className="space-y-4">
        {comments.length === 0 && (
          <p className="text-center text-sm text-white/40">No comments yet. Be the first!</p>
        )}
        {comments.map((comment) => (
          <CommentItem key={comment.id} comment={comment} currentUserId={user?.id} onDelete={remove.mutate} />
        ))}
      </div>
    </div>
  );
}

function CommentItem({
  comment,
  currentUserId,
  onDelete,
}: {
  comment: Comment;
  currentUserId?: string;
  onDelete: (id: string) => void;
}) {
  const isAuthor = comment.userId === currentUserId;
  const displayName = comment.user.displayName || comment.user.username;

  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 text-xs font-bold text-white/70">
        {comment.user.avatarUrl ? (
          <img src={comment.user.avatarUrl} alt={displayName} className="h-full w-full object-cover" />
        ) : (
          displayName.charAt(0).toUpperCase()
        )}
      </div>
      <div className="flex-1">
        <div className="rounded-2xl rounded-tl-none bg-white/5 px-3 py-2">
          <p className="text-xs font-bold text-white/80">{displayName}</p>
          <p className="text-sm text-white/90">{comment.text}</p>
        </div>
        <div className="mt-1 flex items-center gap-3 px-1">
          <span className="text-xs text-white/40">{formatTime(comment.createdAt)}</span>
          {isAuthor && (
            <button
              onClick={() => onDelete(comment.id)}
              className="flex items-center gap-1 text-xs text-white/40 transition-colors hover:text-rose-400"
              aria-label="Delete comment"
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </button>
          )}
        </div>

        {comment.replies.length > 0 && (
          <div className="mt-2 space-y-2 pl-4">
            {comment.replies.map((reply) => (
              <div key={reply.id} className="flex gap-2">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 text-xs font-bold text-white/70">
                  {reply.user.avatarUrl ? (
                    <img src={reply.user.avatarUrl} alt={reply.user.displayName || reply.user.username} className="h-full w-full object-cover" />
                  ) : (
                    (reply.user.displayName || reply.user.username).charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1">
                  <div className="rounded-2xl rounded-tl-none bg-white/5 px-3 py-2">
                    <p className="text-xs font-bold text-white/80">
                      {reply.user.displayName || reply.user.username}
                    </p>
                    <p className="text-sm text-white/90">{reply.text}</p>
                  </div>
                  <span className="mt-1 block px-1 text-xs text-white/40">{formatTime(reply.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
