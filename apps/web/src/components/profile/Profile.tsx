import { useState } from "react";
import { useParams } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { useProfile, useProfileAchievements, useProfileReviews } from "../../hooks/useProfile";
import { useAuthStore } from "../../stores/authStore";
import { FollowButton } from "../social/FollowButton";
import { ProfileReviews } from "./ProfileReviews";
import { ActivityFeed } from "../social/ActivityFeed";
import { Loading } from "../common/Loading";
import { FeedTabs } from "../feed/FeedTabs";
import { Flame, Award, User, Pencil } from "lucide-react";

const TABS = [
  { id: "reviews", label: "Reviews" },
  { id: "activity", label: "Activity" },
  { id: "badges", label: "Badges" },
];

export function Profile() {
  const { id } = useParams<{ id: string }>();
  const currentUser = useAuthStore((s) => s.user);
  const userId = id === "me" ? currentUser?.id : id;
  const { data: profile, isLoading } = useProfile(userId);
  const { data: achievements } = useProfileAchievements(userId);
  const { data: reviews } = useProfileReviews(userId);
  const [activeTab, setActiveTab] = useState("reviews");
  const isMe = currentUser?.id === userId;
  const reducedMotion = useReducedMotion();

  if (isLoading || !profile) {
    return <Loading />;
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header card */}
      <motion.div
        initial={reducedMotion ? {} : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="m-3 rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl"
      >
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-rose-500 via-pink-500 to-violet-500 opacity-60 blur-sm" />
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt=""
                className="relative h-24 w-24 rounded-full object-cover ring-2 ring-white/10"
              />
            ) : (
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-violet-500 text-3xl font-bold text-white ring-2 ring-white/10">
                <User className="h-10 w-10" />
              </div>
            )}
          </div>

          <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">
            {profile.displayName ?? profile.username}
          </h1>
          <p className="text-sm font-semibold text-white/50">@{profile.username}</p>
          {profile.bio && (
            <p className="mt-2 max-w-xs text-center text-sm leading-relaxed text-white/70">
              {profile.bio}
            </p>
          )}

          {/* Stats */}
          <div className="mt-5 grid w-full max-w-sm grid-cols-3 gap-3">
            <StatCard value={profile.reviewCount} label="Reviews" />
            <StatCard value={profile.followerCount} label="Followers" />
            <StatCard value={profile.followingCount} label="Following" />
          </div>

          {/* Chips */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {profile.streakDays > 0 && (
              <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500/20 to-amber-500/20 px-3 py-1.5 text-sm font-bold text-orange-300 ring-1 ring-orange-500/30">
                <Flame className="h-4 w-4" />
                {profile.streakDays} day streak
              </div>
            )}
            {achievements && achievements.achievements.length > 0 && (
              <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-rose-500/20 to-violet-500/20 px-3 py-1.5 text-sm font-bold text-rose-300 ring-1 ring-rose-500/30">
                <Award className="h-4 w-4" />
                {achievements.achievements.length} badges
              </div>
            )}
          </div>

          {/* Action */}
          <div className="mt-5 w-full max-w-sm">
            {!isMe ? (
              <FollowButton userId={userId} isFollowing={profile.isFollowing} />
            ) : (
              <button className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 py-3 font-bold text-white transition-colors hover:bg-white/10">
                <Pencil className="h-4 w-4" />
                Edit profile
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="px-3 pb-2">
        <FeedTabs tabs={TABS} activeId={activeTab} onSelect={(tabId) => setActiveTab(tabId)} />
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "reviews" && <ProfileReviews reviews={reviews?.reviews ?? []} />}
        {activeTab === "activity" && <ActivityFeed />}
        {activeTab === "badges" && (
          <div className="h-full overflow-y-auto p-3">
            <div className="grid grid-cols-2 gap-3">
              {achievements?.achievements.map((a) => (
                <motion.div
                  key={a.id}
                  whileTap={{ scale: 0.98 }}
                  className="glow-border flex flex-col items-center rounded-2xl border border-white/10 bg-white/5 p-4 text-center backdrop-blur-sm"
                >
                  {a.achievement.iconUrl ? (
                    <img src={a.achievement.iconUrl} alt="" className="mb-3 h-12 w-12" />
                  ) : (
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-violet-500">
                      <Award className="h-6 w-6 text-white" />
                    </div>
                  )}
                  <p className="text-sm font-bold text-white">{a.achievement.name}</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/50">{a.achievement.description}</p>
                </motion.div>
              ))}
              {achievements?.achievements.length === 0 && (
                <p className="col-span-2 py-12 text-center text-sm text-white/50">No badges yet.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center backdrop-blur-sm">
      <p className="text-xl font-black tracking-tighter gradient-text">{value.toLocaleString()}</p>
      <p className="text-xs font-semibold uppercase tracking-wider text-white/50">{label}</p>
    </div>
  );
}
