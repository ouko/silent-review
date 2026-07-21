import { useState } from "react";
import { useParams } from "react-router-dom";
import { useProfile, useProfileAchievements, useProfileReviews } from "../../hooks/useProfile";
import { useAuthStore } from "../../stores/authStore";
import { FollowButton } from "../social/FollowButton";
import { ProfileReviews } from "./ProfileReviews";
import { ActivityFeed } from "../social/ActivityFeed";
import { Loading } from "../common/Loading";
import { Flame, Award, User } from "lucide-react";

export function Profile() {
  const { id } = useParams<{ id: string }>();
  const currentUser = useAuthStore((s) => s.user);
  const userId = id === "me" ? currentUser?.id : id;
  const { data: profile, isLoading } = useProfile(userId);
  const { data: achievements } = useProfileAchievements(userId);
  const { data: reviews } = useProfileReviews(userId);
  const [activeTab, setActiveTab] = useState<"reviews" | "activity" | "badges">("reviews");
  const isMe = currentUser?.id === userId;

  if (isLoading || !profile) {
    return <Loading />;
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex flex-col items-center border-b border-white/10 p-6 pb-4">
        {profile.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt=""
            className="h-24 w-24 rounded-full object-cover ring-4 ring-brand-500/30"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-500 text-3xl font-bold ring-4 ring-brand-500/30">
            <User className="h-10 w-10" />
          </div>
        )}
        <h1 className="mt-4 text-2xl font-bold">
          {profile.displayName ?? profile.username}
        </h1>
        <p className="text-white/60">@{profile.username}</p>
        {profile.bio && <p className="mt-2 max-w-xs text-center text-sm text-white/70">{profile.bio}</p>}

        {/* Stats */}
        <div className="mt-4 flex gap-6">
          <Stat value={profile.reviewCount} label="Reviews" />
          <Stat value={profile.followerCount} label="Followers" />
          <Stat value={profile.followingCount} label="Following" />
        </div>

        {/* Streak + Badges summary */}
        <div className="mt-4 flex items-center gap-4">
          {profile.streakDays > 0 && (
            <div className="flex items-center gap-1 rounded-full bg-orange-500/20 px-3 py-1 text-sm font-semibold text-orange-400">
              <Flame className="h-4 w-4" />
              {profile.streakDays} day streak
            </div>
          )}
          {achievements && achievements.achievements.length > 0 && (
            <div className="flex items-center gap-1 rounded-full bg-brand-500/20 px-3 py-1 text-sm font-semibold text-brand-400">
              <Award className="h-4 w-4" />
              {achievements.achievements.length} badges
            </div>
          )}
        </div>

        {/* Follow / Edit */}
        <div className="mt-4">
          {!isMe ? (
            <FollowButton userId={userId} isFollowing={profile.isFollowing} />
          ) : (
            <button className="rounded-full border border-white/30 px-5 py-2 text-sm font-semibold text-white">
              Edit profile
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        <Tab active={activeTab === "reviews"} onClick={() => setActiveTab("reviews")}>
          Reviews
        </Tab>
        <Tab active={activeTab === "activity"} onClick={() => setActiveTab("activity")}>
          Activity
        </Tab>
        <Tab active={activeTab === "badges"} onClick={() => setActiveTab("badges")}>
          Badges
        </Tab>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "reviews" && <ProfileReviews reviews={reviews?.reviews ?? []} />}
        {activeTab === "activity" && <ActivityFeed />}
        {activeTab === "badges" && (
          <div className="grid grid-cols-2 gap-3 overflow-y-auto p-4">
            {achievements?.achievements.map((a) => (
              <div
                key={a.id}
                className="rounded-2xl bg-white/5 p-4 text-center"
              >
                {a.achievement.iconUrl ? (
                  <img src={a.achievement.iconUrl} alt="" className="mx-auto mb-2 h-10 w-10" />
                ) : (
                  <Award className="mx-auto mb-2 h-10 w-10 text-brand-400" />
                )}
                <p className="text-sm font-semibold">{a.achievement.name}</p>
                <p className="text-xs text-white/50">{a.achievement.description}</p>
              </div>
            ))}
            {achievements?.achievements.length === 0 && (
              <p className="col-span-2 py-12 text-center text-sm text-white/50">No badges yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <p className="text-xl font-bold">{value}</p>
      <p className="text-sm text-white/60">{label}</p>
    </div>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-3 text-sm font-semibold ${
        active ? "border-b-2 border-brand-500 text-white" : "text-white/50"
      }`}
    >
      {children}
    </button>
  );
}
