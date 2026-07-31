import { useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { useProfile, useProfileAchievements, useProfileReviews } from "../../hooks/useProfile";
import { useAuthStore } from "../../stores/authStore";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { FollowButton } from "../social/FollowButton";
import { ProfileReviews } from "./ProfileReviews";
import { ActivityFeed } from "../social/ActivityFeed";
import { Loading } from "../common/Loading";
import { FeedTabs } from "../feed/FeedTabs";
import { UserListSheet } from "./UserListSheet";
import { Flame, Award, User, Pencil, LogOut, ShieldCheck, BarChart3 } from "lucide-react";
import { logout } from "../../lib/auth";

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
  const [sheetType, setSheetType] = useState<"followers" | "following" | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

  function startEditing() {
    if (!profile) return;
    setEditName(profile.displayName ?? "");
    setEditBio(profile.bio ?? "");
    setAvatarFile(null);
    setIsEditing(true);
  }

  async function saveEditing() {
    if (!profile) return;
    setIsSaving(true);
    try {
      if (avatarFile) {
        const form = new FormData();
        form.append("file", avatarFile);
        await api.post("/api/users/me/avatar", form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      await api.patch("/api/users/me", { displayName: editName, bio: editBio });
      await queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      await queryClient.invalidateQueries({ queryKey: ["profile-reviews", userId] });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  }
  const isMe = currentUser?.id === userId;
  const reducedMotion = useReducedMotion();
  const tabsRef = useRef<HTMLDivElement>(null);

  function scrollToTabs() {
    // Bring the tab bar (sticky) to the top so the tab content is visible.
    tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleReviewsStatClick() {
    setActiveTab("reviews");
    scrollToTabs();
  }

  function handleTabSelect(tabId: string) {
    setActiveTab(tabId);
    scrollToTabs();
  }

  if (isLoading || !profile) {
    return <Loading />;
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex min-h-full flex-col">
      {/* Header card */}
      <motion.div
        data-profile-username={profile.username}
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
            <StatCard value={profile.reviewCount} label="Reviews" onClick={handleReviewsStatClick} />
            <StatCard value={profile.followerCount} label="Followers" onClick={() => setSheetType("followers")} />
            <StatCard value={profile.followingCount} label="Following" onClick={() => setSheetType("following")} />
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
              <div className="space-y-2">
                <Link
                  to="/analytics"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 py-3 font-bold text-white transition-colors hover:bg-white/10"
                >
                  <BarChart3 className="h-4 w-4" />
                  Analytics
                </Link>
                {currentUser?.role === "ADMIN" && (
                  <Link
                    to="/admin"
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-violet-400/40 bg-violet-500/10 py-3 font-bold text-violet-300 transition-colors hover:bg-violet-500/20"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Admin
                  </Link>
                )}
                {isEditing ? (
                  <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-3">
                    <label className="flex cursor-pointer items-center gap-3">
                      {avatarFile ? (
                        <img src={URL.createObjectURL(avatarFile)} alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-white/10" />
                      ) : profile.avatarUrl ? (
                        <img src={profile.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-white/10" />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-violet-500 ring-2 ring-white/10">
                          <User className="h-6 w-6 text-white" />
                        </div>
                      )}
                      <span className="text-sm font-semibold text-white/70">
                        {avatarFile ? avatarFile.name : "Tap to change profile photo"}
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
                      />
                    </label>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      maxLength={50}
                      placeholder="Display name"
                      aria-label="Display name"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/40 outline-none focus:border-white/20"
                    />
                    <textarea
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      maxLength={160}
                      rows={3}
                      placeholder="Bio"
                      aria-label="Bio"
                      className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/40 outline-none focus:border-white/20"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={saveEditing}
                        disabled={isSaving}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 via-pink-500 to-violet-500 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        {isSaving ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={() => setIsEditing(false)}
                        disabled={isSaving}
                        className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-bold text-white/70 transition-colors hover:bg-white/10 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={startEditing}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 py-3 font-bold text-white transition-colors hover:bg-white/10"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit profile
                  </button>
                )}
                <button
                  onClick={async () => {
                    setIsLoggingOut(true);
                    await logout();
                  }}
                  disabled={isLoggingOut}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 py-3 font-bold text-white transition-colors hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <LogOut className="h-4 w-4" />
                  {isLoggingOut ? "Logging out..." : "Log out"}
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {sheetType && userId && (
        <UserListSheet
          userId={userId}
          username={profile.username}
          type={sheetType}
          onClose={() => setSheetType(null)}
        />
      )}

      {/* Tabs */}
      <div ref={tabsRef} className="sticky top-0 z-10 bg-black/80 px-3 pb-2 backdrop-blur-xl">
        <FeedTabs tabs={TABS} activeId={activeTab} onSelect={handleTabSelect} />
      </div>

      {/* Tab content */}
      <div className="flex-1">
        {activeTab === "reviews" && <ProfileReviews reviews={reviews?.reviews ?? []} isOwnProfile={isMe} />}
        {activeTab === "activity" && <ActivityFeed />}
        {activeTab === "badges" && (
          <div className="p-3">
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
    </div>
  );
}

function StatCard({
  value,
  label,
  onClick,
}: {
  value: number;
  label: string;
  onClick?: () => void;
}) {
  const content = (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center backdrop-blur-sm transition-colors hover:bg-white/10">
      <p className="text-xl font-black tracking-tighter gradient-text">{value.toLocaleString()}</p>
      <p className="text-xs font-semibold uppercase tracking-wider text-white/50">{label}</p>
    </div>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="w-full text-left transition-transform active:scale-95"
      >
        {content}
      </button>
    );
  }
  return content;
}
