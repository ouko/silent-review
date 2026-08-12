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
import { Avatar } from "../ui/Avatar";
import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";
import { Sheet } from "../ui/Sheet";
import { Button } from "../ui/Button";

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
  const reducedMotion = useReducedMotion();

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
  const tabsRef = useRef<HTMLDivElement>(null);

  function scrollToTabs() {
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

  const displayName = profile.displayName ?? profile.username;

  return (
    <div className="h-full overflow-y-auto no-scrollbar">
      <div className="flex min-h-full flex-col">
        <motion.div
          data-profile-username={profile.username}
          initial={reducedMotion ? {} : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="m-3 rounded-[2rem] border border-white/10 bg-white/5 p-5 backdrop-blur-2xl"
        >
          <div className="flex flex-col items-center">
            <Avatar src={profile.avatarUrl} name={displayName} size="lg" />

            <h1 className="mt-4 font-heading text-2xl font-bold tracking-tight text-white">
              {displayName}
            </h1>
            <p className="text-sm font-semibold text-white/50">@{profile.username}</p>
            {profile.bio && (
              <p className="mt-2 max-w-xs text-center text-sm leading-relaxed text-white/70">
                {profile.bio}
              </p>
            )}

            <div className="mt-5 grid w-full max-w-sm grid-cols-3 gap-3">
              <StatCard value={profile.reviewCount} label="Reviews" onClick={handleReviewsStatClick} />
              <StatCard value={profile.followerCount} label="Followers" onClick={() => setSheetType("followers")} />
              <StatCard value={profile.followingCount} label="Following" onClick={() => setSheetType("following")} />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {profile.streakDays > 0 && (
                <Badge variant="yellow">
                  <Flame className="h-3.5 w-3.5" />
                  {profile.streakDays} day streak
                </Badge>
              )}
              {achievements && achievements.achievements.length > 0 && (
                <Badge variant="primary">
                  <Award className="h-3.5 w-3.5" />
                  {achievements.achievements.length} badges
                </Badge>
              )}
            </div>

            <div className="mt-5 w-full max-w-sm space-y-2">
              {!isMe ? (
                <FollowButton userId={userId} isFollowing={profile.isFollowing} />
              ) : (
                <>
                  <Button variant="ghost" shape="rounded" className="w-full" onClick={startEditing}>
                    <Pencil className="h-4 w-4" />
                    Edit profile
                  </Button>
                  <Link to="/analytics" className="block w-full">
                    <Button variant="glass" shape="rounded" className="w-full">
                      <BarChart3 className="h-4 w-4" />
                      Analytics
                    </Button>
                  </Link>
                  {currentUser?.role === "ADMIN" && (
                    <Link to="/admin" className="block w-full">
                      <Button variant="primary" shape="rounded" className="w-full">
                        <ShieldCheck className="h-4 w-4" />
                        Admin
                      </Button>
                    </Link>
                  )}
                  <Button
                    variant="ghost"
                    shape="rounded"
                    className="w-full"
                    onClick={async () => {
                      setIsLoggingOut(true);
                      await logout();
                    }}
                    disabled={isLoggingOut}
                  >
                    <LogOut className="h-4 w-4" />
                    {isLoggingOut ? "Logging out..." : "Log out"}
                  </Button>
                </>
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

        <Sheet isOpen={isEditing} onClose={() => !isSaving && setIsEditing(false)} title="Edit profile">
          <div className="space-y-4">
            <label className="flex cursor-pointer items-center gap-4">
              {avatarFile ? (
                <img src={URL.createObjectURL(avatarFile)} alt="" className="h-16 w-16 rounded-full object-cover ring-2 ring-white/10" />
              ) : profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover ring-2 ring-white/10" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-accent-pink ring-2 ring-white/10">
                  <User className="h-8 w-8 text-white" />
                </div>
              )}
              <span className="text-sm font-semibold text-white/70">
                {avatarFile ? avatarFile.name : "Tap to change photo"}
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
              className="input-modern"
            />
            <textarea
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              maxLength={160}
              rows={3}
              placeholder="Bio"
              aria-label="Bio"
              className="input-modern resize-none"
            />
            <div className="flex gap-3">
              <Button variant="primary" shape="rounded" className="flex-1" onClick={saveEditing} loading={isSaving}>
                Save
              </Button>
              <Button
                variant="ghost"
                shape="rounded"
                className="flex-1"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Sheet>

        <div ref={tabsRef} className="sticky top-0 z-10 bg-void/80 px-3 pb-2 backdrop-blur-2xl">
          <FeedTabs tabs={TABS} activeId={activeTab} onSelect={handleTabSelect} />
        </div>

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
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-accent-pink">
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
    <Card className="p-3 text-center" glow={false} lift={false}>
      <p className="font-heading text-xl font-black tracking-tighter gradient-text">{value.toLocaleString()}</p>
      <p className="text-xs font-semibold uppercase tracking-[0.05em] text-white/50">{label}</p>
    </Card>
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
