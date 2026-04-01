import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import NavBar from "@/app/components/layout/navbar";
import FollowButton from "@/app/components/profile/FollowButton";
import { getFollowCounts, isFollowingUser } from "@/lib/follow-data";
import { getImplementedIdeaCountByUserId } from "@/lib/feedback-data";
import type { FeedPost, ReactionType } from "@/types/feed";
import type { Database } from "@/types/database";
import UserProfileContent from "@/app/components/profile/UserProfileContent";
import ProfileBadgesSection from "@/app/components/profile/ProfileBadgesSection";

export const dynamic = "force-dynamic";

type ProfilePageProps = {
  params: Promise<{
    username: string;
  }>;
};

type PostRow = {
  id: number;
  content: string | null;
  created_at: string;
  user_id: string | null;
  comments_count: number | null;
};

type CommentRow = {
  post_id: number;
};

type PostReactionRow = {
  post_id: number;
  user_id: string;
  reaction: ReactionType;
};

type HallOfFameRow =
  Database["public"]["Tables"]["weekly_post_hall_of_fame"]["Row"];

// =====================================================
// Component
// =====================================================

export default async function ProfilePage({ params }: ProfilePageProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let navUser: {
    username: string;
    avatar_url: string | null;
    is_admin: boolean;
  } | null = null;

  if (user) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("username, avatar_url, is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      throw new Error(profileError.message);
    }

    if (profile?.username) {
      navUser = {
        username: profile.username,
        avatar_url: profile.avatar_url ?? null,
        is_admin: profile.is_admin ?? false,
      };
    }
  }

  let viewerIsAdmin = false;

  if (user) {
    const { data: viewerProfile, error: viewerProfileError } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (viewerProfileError) {
      throw new Error(viewerProfileError.message);
    }

    viewerIsAdmin = viewerProfile?.is_admin ?? false;
  }

  const { username } = await params;
  const usernameFromUrl = decodeURIComponent(username).trim().toLowerCase();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, bio, avatar_url, created_at, badges")
    .eq("username", usernameFromUrl)
    .maybeSingle();

  if (profileError || !profile) {
    return (
      <>
        <NavBar user={navUser} />

        <main className="mx-auto max-w-2xl p-6">
          <div className="rounded-xl bg-white p-6 shadow">
            <h1 className="text-2xl font-bold">Profil nicht gefunden</h1>
          </div>
        </main>
      </>
    );
  }

  // =====================================================
  // Posts laden
  // =====================================================

  const { data: postsData, error: postsError } = await supabase
    .from("posts")
    .select("id, content, created_at, user_id, comments_count")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  if (postsError) {
    throw new Error(postsError.message);
  }

  const typedPosts = (postsData ?? []) as PostRow[];
  const postIds = typedPosts.map((post) => post.id);

  // =====================================================
  // Kommentare zählen
  // =====================================================

  const commentCountMap = new Map<number, number>();

  if (postIds.length > 0) {
    const { data: commentsData, error: commentsError } = await supabase
      .from("comments")
      .select("post_id")
      .in("post_id", postIds);

    if (commentsError) {
      throw new Error(commentsError.message);
    }

    for (const comment of (commentsData ?? []) as CommentRow[]) {
      if (typeof comment.post_id !== "number") continue;

      commentCountMap.set(
        comment.post_id,
        (commentCountMap.get(comment.post_id) ?? 0) + 1
      );
    }
  }

  // =====================================================
  // Reactions laden
  // =====================================================

  const reactionCountMap = new Map<
    number,
    {
      like: number;
      funny: number;
      wow: number;
      fire: number;
    }
  >();

  const viewerReactionMap = new Map<number, ReactionType | null>();

  if (postIds.length > 0) {
    const { data: reactionsData, error: reactionsError } = await supabase
      .from("post_reactions")
      .select("post_id, user_id, reaction")
      .in("post_id", postIds);

    if (reactionsError) {
      throw new Error(reactionsError.message);
    }

    for (const reaction of (reactionsData ?? []) as PostReactionRow[]) {
      const current = reactionCountMap.get(reaction.post_id) ?? {
        like: 0,
        funny: 0,
        wow: 0,
        fire: 0,
      };

      if (reaction.reaction === "like") current.like += 1;
      if (reaction.reaction === "funny") current.funny += 1;
      if (reaction.reaction === "wow") current.wow += 1;
      if (reaction.reaction === "fire") current.fire += 1;

      reactionCountMap.set(reaction.post_id, current);

      if (user && reaction.user_id === user.id) {
        viewerReactionMap.set(reaction.post_id, reaction.reaction);
      }
    }
  }

  // =====================================================
  // Feed Posts mappen
  // =====================================================

  const posts: FeedPost[] = typedPosts.map((post) => {
    const reactionCounts = reactionCountMap.get(post.id) ?? {
      like: 0,
      funny: 0,
      wow: 0,
      fire: 0,
    };

    const reactionsCount =
      reactionCounts.like +
      reactionCounts.funny +
      reactionCounts.wow +
      reactionCounts.fire;

    return {
      id: post.id,
      content: post.content ?? "",
      created_at: post.created_at,
      comments_count: commentCountMap.get(post.id) ?? post.comments_count ?? 0,
      reactions_count: reactionsCount,
      reaction_counts: reactionCounts,
      viewer_reaction: viewerReactionMap.get(post.id) ?? null,
      can_delete: !!user && (post.user_id === user.id || viewerIsAdmin),
      author_username: profile.username,
      author_avatar_url: profile.avatar_url ?? null,
    };
  });

  // =====================================================
  // Zusatzdaten
  // =====================================================

  const { followersCount, followingCount } = await getFollowCounts(
    supabase,
    profile.id
  );

  const isFollowing = await isFollowingUser(
    supabase,
    user?.id ?? null,
    profile.id
  );

  const implementedIdeaCount = await getImplementedIdeaCountByUserId(
    supabase,
    profile.id
  );

  const { data: hallOfFameData, error: hallOfFameError } = await supabase
    .from("weekly_post_hall_of_fame")
    .select("*")
    .eq("author_id", profile.id)
    .order("week_start", { ascending: false });

  if (hallOfFameError) {
    throw new Error(hallOfFameError.message);
  }

  const hallOfFameEntries = (hallOfFameData ?? []) as HallOfFameRow[];
  const hallOfFameCount = hallOfFameEntries.length;

  const isOwnProfile = user?.id === profile.id;
  const profileBadges = Array.isArray(profile.badges)
    ? profile.badges.filter((value): value is string => typeof value === "string")
    : [];

  return (
    <>
      <NavBar user={navUser} />

      <main className="mx-auto max-w-2xl px-4 py-4 sm:p-6">
        <div className="mb-6 rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
          {/* =====================================================
              Profilkopf
          ===================================================== */}
          <div className="flex flex-col gap-4 sm:gap-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-2xl font-semibold text-gray-600 sm:h-24 sm:w-24">
                  {profile.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.avatar_url}
                      alt={`${profile.username} avatar`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    profile.username.charAt(0).toUpperCase()
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="break-all text-2xl font-bold text-black sm:text-3xl">
                      @{profile.username}
                    </h1>

                    {implementedIdeaCount > 0 && (
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                        Contributor
                      </span>
                    )}

                    {hallOfFameCount > 0 && (
                      <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700">
                        Hall of Fame
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-sm text-gray-500">
                    Beigetreten am{" "}
                    {new Date(profile.created_at).toLocaleDateString("de-CH")}
                  </p>

                  {implementedIdeaCount > 0 && (
                    <p className="mt-1 text-sm text-amber-700">
                      {implementedIdeaCount} umgesetzte{" "}
                      {implementedIdeaCount === 1 ? "Idee" : "Ideen"}
                    </p>
                  )}

                  {hallOfFameCount > 0 && (
                    <p className="mt-1 text-sm text-indigo-700">
                      {hallOfFameCount} Hall-of-Fame-
                      {hallOfFameCount === 1 ? "Eintrag" : "Einträge"}
                    </p>
                  )}
                </div>
              </div>

              <div className="w-full sm:w-auto">
                {isOwnProfile ? (
                  <Link
                    href="/settings/profile"
                    className="inline-flex w-full items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 sm:w-auto"
                  >
                    Profil bearbeiten
                  </Link>
                ) : user ? (
                  <div className="w-full sm:w-auto">
                    <FollowButton
                      isFollowing={isFollowing}
                      targetUserId={profile.id}
                      targetUsername={profile.username}
                      path={`/u/${profile.username}`}
                    />
                  </div>
                ) : null}
              </div>
            </div>

            <ProfileBadgesSection
              targetUserId={profile.id}
              initialBadges={profileBadges}
              viewerIsAdmin={viewerIsAdmin}
            />
          </div>
        </div>

        <UserProfileContent
          initialPosts={posts}
          followersCount={followersCount}
          followingCount={followingCount}
          username={profile.username}
        />
      </main>
    </>
  );
}