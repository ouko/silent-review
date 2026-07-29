import { UserListItem } from "./UserListItem";
import type { UserSummary } from "../../hooks/useProfile";

interface UserListProps {
  users: UserSummary[];
  emptyMessage: string;
}

export function UserList({ users, emptyMessage }: UserListProps) {
  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center">
        <p className="text-white/50">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 overflow-y-auto p-1">
      {users.map((user) => (
        <UserListItem key={user.id} user={user} />
      ))}
    </div>
  );
}
