import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";

interface ProfileData {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: string;
  reviewCount: number;
  followerCount: number;
  followingCount: number;
}

export function Profile() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<ProfileData | null>(null);

  useEffect(() => {
    if (!id) return;
    api.get(`/api/users/${id}`).then((res) => setProfile(res.data));
  }, [id]);

  if (!profile) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center p-6">
      {profile.avatarUrl ? (
        <img src={profile.avatarUrl} alt="" className="h-24 w-24 rounded-full object-cover" />
      ) : (
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-500 text-3xl font-bold">
          {profile.username[0]?.toUpperCase()}
        </div>
      )}
      <h1 className="mt-4 text-2xl font-bold">{profile.displayName ?? profile.username}</h1>
      <p className="text-white/60">@{profile.username}</p>
      <div className="mt-6 flex gap-6">
        <div className="text-center">
          <p className="text-xl font-bold">{profile.reviewCount}</p>
          <p className="text-sm text-white/60">Reviews</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold">{profile.followerCount}</p>
          <p className="text-sm text-white/60">Followers</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold">{profile.followingCount}</p>
          <p className="text-sm text-white/60">Following</p>
        </div>
      </div>
    </div>
  );
}
