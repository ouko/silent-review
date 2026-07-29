import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useFollowers, useFollowing } from "../../hooks/useProfile";
import { UserList } from "./UserList";
import { Loading } from "../common/Loading";

interface UserListSheetProps {
  userId: string;
  username: string;
  type: "followers" | "following";
  onClose: () => void;
}

export function UserListSheet({ userId, username, type, onClose }: UserListSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const backdropPointer = useRef<{ x: number; y: number } | null>(null);
  const dragStartY = useRef<number | null>(null);
  const [dragDelta, setDragDelta] = useState(0);
  const [mounted, setMounted] = useState(false);

  const isFollowers = type === "followers";
  const title = isFollowers ? "Followers" : "Following";
  const emptyMessage = isFollowers ? "No followers yet." : "Not following anyone yet.";

  const followersQuery = useFollowers(isFollowers ? userId : undefined);
  const followingQuery = useFollowing(!isFollowers ? userId : undefined);
  const query = isFollowers ? followersQuery : followingQuery;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    const sheet = sheetRef.current;
    if (!sheet) return;

    const focusable = sheet.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const elements = Array.from(focusable).filter(
        (el) => !(el as HTMLButtonElement | HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).disabled
      );
      if (elements.length === 0) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [onClose]);

  const sheet = (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80"
      role="presentation"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) {
          backdropPointer.current = { x: e.clientX, y: e.clientY };
        }
      }}
      onPointerUp={(e) => {
        if (e.target !== e.currentTarget || !backdropPointer.current) return;
        const dx = e.clientX - backdropPointer.current.x;
        const dy = e.clientY - backdropPointer.current.y;
        backdropPointer.current = null;
        if (Math.hypot(dx, dy) < 10) onClose();
      }}
      style={{ WebkitOverflowScrolling: "touch", overscrollBehaviorY: "contain" }}
    >
      <div className="flex min-h-full items-end justify-center p-4">
        <div
          ref={sheetRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="userlist-title"
          className="flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl bg-zinc-900 p-5 text-white"
          style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
        >
          <div
            className="flex cursor-grab flex-col items-center pb-2 active:cursor-grabbing"
            onPointerDown={(e) => {
              dragStartY.current = e.clientY;
              setDragDelta(0);
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (dragStartY.current == null) return;
              const delta = Math.max(0, e.clientY - dragStartY.current);
              setDragDelta(delta);
            }}
            onPointerUp={(e) => {
              if (dragStartY.current == null) return;
              const delta = e.clientY - dragStartY.current;
              dragStartY.current = null;
              setDragDelta(0);
              if (delta > 80) onClose();
            }}
            onPointerCancel={() => {
              dragStartY.current = null;
              setDragDelta(0);
            }}
            style={{
              transform: `translateY(${dragDelta}px)`,
              transition: dragDelta === 0 ? "transform 0.2s ease-out" : undefined,
            }}
          >
            <div className="mb-3 h-1 w-12 rounded-full bg-white/30" aria-hidden="true" />
          </div>

          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 id="userlist-title" className="text-lg font-bold">{title}</h2>
              <p className="text-sm text-white/50">@{username}</p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="rounded-full p-1 hover:bg-white/10"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            {query.isLoading || !query.data ? (
              <Loading />
            ) : (
              <UserList users={query.data.users} emptyMessage={emptyMessage} />
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return mounted ? createPortal(sheet, document.body) : null;
}
