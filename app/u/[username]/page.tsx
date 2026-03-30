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
  comments_count: number;
};

type CommentRow = {
  post_id: number;
};

type HallOfFameRow =
  Database["public"]["Tables"]["weekly_post_hall_of_fame"]["Row"];

function getBadgeLabel(category: string) {
  if (category === "likes") return "Most Liked Post Winner";
  if (category === "relevance") return "Most Relevant Post Winner";
  if (category === "comments") return "Most Commented Post Winner";
  return "Hall of Fame Winner";
}

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
            <h1 className="text-2xl font-bold">Profile not found</h1>
          </div>
        </main>
      </>
    );
  }

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

  const posts: FeedPost[] = typedPosts.map((post) => ({
    id: post.id,
    content: post.content ?? "",
    created_at: post.created_at,
    comments_count: commentCountMap.get(post.id) ?? 0,
    reactions_count: 0,
    reaction_counts: {
      like: 0,
      funny: 0,
      wow: 0,
      fire: 0,
    },
    viewer_reaction: null,
    can_delete: !!user && (post.user_id === user.id || viewerIsAdmin),
    author_username: profile.username,
    author_avatar_url: profile.avatar_url ?? null,
  }));

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

  const uniqueBadgeCategories = Array.from(
    new Set(hallOfFameEntries.map((entry) => entry.category))
  );

  const isOwnProfile = user?.id === profile.id;
  const profileBadges = Array.isArray(profile.badges)
    ? profile.badges.filter((value): value is string => typeof value === "string")
    : [];

  return (
    <>
      <NavBar user={navUser} />

      <main className="mx-auto max-w-2xl p-6">
        <div className="mb-6 rounded-xl bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-2xl font-semibold text-gray-600">
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

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold">@{profile.username}</h1>

                  {implementedIdeaCount > 0 && (
                    <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                      Contributor
                    </span>
                  )}

                  {hallOfFameCount > 0 && (
                    <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700">
                      Hall of Fame
                    </span>
                  )}
                </div>

                <p className="mt-1 text-sm text-gray-500">
                  Joined {new Date(profile.created_at).toLocaleDateString()}
                </p>

                {implementedIdeaCount > 0 && (
                  <p className="mt-1 text-sm text-amber-700">
                    {implementedIdeaCount} implemented{" "}
                    {implementedIdeaCount === 1 ? "idea" : "ideas"}
                  </p>
                )}

                {hallOfFameCount > 0 && (
                  <p className="mt-1 text-sm text-indigo-700">
                    {hallOfFameCount} Hall of Fame{" "}
                    {hallOfFameCount === 1 ? "entry" : "entries"}
                  </p>
                )}
              </div>
            </div>

            <div>
              {isOwnProfile ? (
                <Link
                  href="/settings/profile"
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700"
                >
                  Edit profile
                </Link>
              ) : user ? (
                <FollowButton
                  isFollowing={isFollowing}
                  targetUserId={profile.id}
                  targetUsername={profile.username}
                  path={`/u/${profile.username}`}
                />
              ) : null}
            </div>
          </div>

          <ProfileBadgesSection
            targetUserId={profile.id}
            initialBadges={profileBadges}
            viewerIsAdmin={viewerIsAdmin}
          />
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