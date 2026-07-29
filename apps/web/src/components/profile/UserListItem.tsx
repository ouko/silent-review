import { Link } from "react-router-dom";
import { User } from "lucide-react";
import { FollowButton } from "../social/FollowButton";
import type { UserSummary } from "../../hooks/useProfile";

interface UserListItemProps {
  user: UserSummary;
}

export function UserListItem({ user }: UserListItemProps) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
      <Link to={`/profile/${user.id}`} className="relative shrink-0">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt=""
            className="h-12 w-12 rounded-full object-cover ring-2 ring-white/10"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-violet-500 ring-2 ring-white/10">
            <User className="h-6 w-6 text-white" />
          </div>
        )}
      </Link>
      <Link to={`/profile/${user.id}`} className="min-w-0 flex-1">
        <p className="truncate font-bold text-white">
          {user.displayName ?? user.username}
        </p>
        <p className="truncate text-sm text-white/50">@{user.username}</p>
      </Link>
      <FollowButton userId={user.id} isFollowing={user.isFollowing} size="sm" />
    </div>
  );
}
