import { useState } from "react";
import { useComments, usePostComment, type Comment } from "../../hooks/useComments";
import { useAuthStore } from "../../stores/authStore";
import { Loader2 } from "lucide-react";

interface CommentsSectionProps {
  reviewId?: string;
}

const MAX_COMMENT_LENGTH = 280;

export function CommentsSection({ reviewId }: CommentsSectionProps) {
  const { data, isLoading } = useComments(reviewId);
  const post = usePostComment(reviewId);
  const currentUser = useAuthStore((s) => s.user);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    await post.mutateAsync({ text: text.trim(), parentId: replyTo?.id });
    setText("");
    setReplyTo(null);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {isLoading && (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-white/70" />
          </div>
        )}
        {data?.comments.length === 0 && (
          <p className="py-8 text-center text-sm text-white/50">No comments yet. Be the first.</p>
        )}
        {data?.comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            onReply={() => setReplyTo(comment)}
            isReplying={replyTo?.id === comment.id}
          />
        ))}
      </div>

      {currentUser && (
        <form onSubmit={handleSubmit} className="border-t border-white/10 p-3">
          {replyTo && (
            <div className="mb-2 flex items-center justify-between text-xs text-white/60">
              <span>Replying to @{replyTo.user.username}</span>
              <button type="button" onClick={() => setReplyTo(null)} className="text-white/80">
                Cancel
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_COMMENT_LENGTH))}
              placeholder="Add a comment..."
              className="flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white outline-none transition-colors placeholder-white/40 focus:border-white/20 focus:bg-white/10"
              maxLength={MAX_COMMENT_LENGTH}
            />
            <button
              type="submit"
              disabled={!text.trim() || post.isPending}
              className="rounded-full bg-gradient-to-r from-rose-500 via-pink-500 to-violet-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-rose-500/20 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {post.isPending ? "..." : "Post"}
            </button>
          </div>
          <p className="mt-1 text-right text-xs text-white/40">{text.length}/{MAX_COMMENT_LENGTH}</p>
        </form>
      )}
    </div>
  );
}

function CommentItem({
  comment,
  onReply,
  isReplying,
}: {
  comment: Comment;
  onReply: () => void;
  isReplying: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex gap-3">
        <Avatar user={comment.user} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">@{comment.user.username}</span>
            <span className="text-xs text-white/40">
              {new Date(comment.createdAt).toLocaleDateString()}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-white/90">{comment.text}</p>
          <button
            onClick={onReply}
            className={`mt-1 text-xs font-semibold ${isReplying ? "text-rose-400" : "text-white/50 hover:text-white/80"}`}
          >
            Reply
          </button>
        </div>
      </div>
      {comment.replies?.map((reply) => (
        <div key={reply.id} className="ml-10 flex gap-3 border-l border-white/10 pl-3">
          <Avatar user={reply.user} size="sm" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">@{reply.user.username}</span>
              <span className="text-xs text-white/40">
                {new Date(reply.createdAt).toLocaleDateString()}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-white/90">{reply.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function Avatar({ user, size = "md" }: { user: { username: string; avatarUrl: string | null }; size?: "sm" | "md" }) {
  const sizeClass = size === "sm" ? "h-7 w-7 text-xs" : "h-9 w-9 text-sm";
  return user.avatarUrl ? (
    <img src={user.avatarUrl} alt="" className={`${sizeClass} rounded-full object-cover`} />
  ) : (
    <div className={`${sizeClass} flex items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-violet-500 font-bold text-white`}>
      {user.username[0]?.toUpperCase()}
    </div>
  );
}
