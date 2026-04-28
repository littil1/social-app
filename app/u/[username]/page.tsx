import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { resolvePostCommentCounts } from "@/features/comments/lib/post-comment-counts";
import NavBar from "@/shared/components/layout/navbar";
import FollowButton from "@/features/profile/components/FollowButton";
import { getCurrentZurichDayStartIso } from "@/features/winners/lib/daily-ranking";
import {
  getFollowCounts,
  isFollowingUser,
} from "@/features/profile/lib/follow-data";
import { getComputedUserBadges } from "@/features/badges/lib/showcase-badges";
import { getProfileBadge } from "@/features/badges/lib/profile-badges";
import type { FeedPost, ReactionType } from "@/shared/types/feed";
import UserProfileContent from "@/features/profile/components/UserProfileContent";
import ProfileBadgesSection from "@/features/profile/components/ProfileBadgesSection";

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

type PostReactionRow = {
  post_id: number;
  user_id: string;
  reaction: ReactionType;
};

type ProfileRow = {
  id: string;
  username: string;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  badges: string[];
};

function formatProfileMonth(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
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
          <div className="rounded-[32px] border border-neutral-200 bg-white p-12 text-center shadow-sm">
            <h1 className="text-2xl font-black tracking-tight text-neutral-950">
              Profile not found
            </h1>
          </div>
        </main>
      </>
    );
  }

  const typedProfile = profile as ProfileRow;

  const { data: postsData, error: postsError } = await supabase
    .from("posts")
    .select("id, content, created_at, user_id, comments_count")
    .eq("user_id", typedProfile.id)
    .lt("created_at", getCurrentZurichDayStartIso(new Date()))
    .order("created_at", { ascending: false });

  if (postsError) {
    throw new Error(postsError.message);
  }

  const typedPosts = (postsData ?? []) as PostRow[];
  const postIds = typedPosts.map((post) => post.id);
  const commentCountMap = await resolvePostCommentCounts(supabase, typedPosts);

  const reactionCountMap = new Map<
    number,
    { like: number; funny: number; wow: number; fire: number }
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

  const posts: FeedPost[] = typedPosts.map((post) => {
    const reactionCounts = reactionCountMap.get(post.id) ?? {
      like: 0,
      funny: 0,
      wow: 0,
      fire: 0,
    };

    return {
      id: post.id,
      content: post.content ?? "",
      created_at: post.created_at,
      comments_count: commentCountMap.get(post.id) ?? 0,
      reactions_count:
        reactionCounts.like +
        reactionCounts.funny +
        reactionCounts.wow +
        reactionCounts.fire,
      reaction_counts: reactionCounts,
      viewer_reaction: viewerReactionMap.get(post.id) ?? null,
      can_delete: !!user && (post.user_id === user.id || viewerIsAdmin),
      author_username: typedProfile.username,
      author_avatar_url: typedProfile.avatar_url ?? null,
    };
  });

  const isFollowing = await isFollowingUser(
    supabase,
    user?.id ?? null,
    typedProfile.id
  );
  const { followersCount, followingCount } = await getFollowCounts(
    supabase,
    typedProfile.id
  );
  const isOwnProfile = user?.id === typedProfile.id;
  const profileBadges = await getComputedUserBadges(supabase, typedProfile.id, {
    includeProgress: isOwnProfile,
  });
  const specialBadges = Array.isArray(typedProfile.badges)
    ? typedProfile.badges
        .map((badgeKey) => getProfileBadge(badgeKey))
        .filter((badge): badge is NonNullable<typeof badge> => badge !== null)
    : [];
  const badgeCount = profileBadges.length + specialBadges.length;
  const legendWins =
    profileBadges.find((badge) => badge.family === "legend")?.total.count ?? 0;
  const legacyStartedLabel = formatProfileMonth(typedProfile.created_at);
  const heroStats = [
    { label: "Top posts", value: legendWins },
    { label: "Badges", value: badgeCount },
    { label: "Posts", value: posts.length },
    { label: "Followers", value: followersCount },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <NavBar user={navUser} />
      <main className="mx-auto max-w-4xl px-4 pb-28 pt-8 sm:py-16">
        <div className="overflow-hidden rounded-[40px] border border-neutral-200 bg-white shadow-[0_20px_50px_-20px_rgba(0,0,0,0.05)]">
          <div className="relative h-32 overflow-hidden bg-neutral-950">
            <div className="absolute right-0 top-0 h-full w-full bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.15),transparent_50%)]" />
            <div className="absolute bottom-0 left-0 h-full w-full bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.05),transparent_40%)]" />
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
          </div>

          <div className="relative px-6 pb-10 sm:px-10">
            <div className="relative -mt-16 mb-8 flex items-end justify-between gap-4">
              <div className="relative">
                <div className="absolute inset-0 rounded-[32px] bg-amber-400/20 blur-2xl" />
                <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-[32px] border-[6px] border-white bg-neutral-100 text-4xl font-black text-neutral-400 shadow-xl sm:h-36 sm:w-36">
                  {typedProfile.avatar_url ? (
                    <Image
                      src={typedProfile.avatar_url}
                      alt={`${typedProfile.username} avatar`}
                      width={144}
                      height={144}
                      sizes="(min-width: 640px) 144px, 112px"
                      priority
                      unoptimized
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    typedProfile.username.charAt(0).toUpperCase()
                  )}
                </div>
              </div>

              <div className="mb-2">
                {isOwnProfile ? (
                  <Link
                    href="/settings/profile"
                    className="inline-flex items-center justify-center rounded-2xl border border-neutral-200 bg-white px-6 py-3 text-sm font-bold text-neutral-950 shadow-sm transition-all hover:scale-105 hover:bg-neutral-50 active:scale-95"
                  >
                    Edit Profile
                  </Link>
                ) : user ? (
                  <div className="origin-bottom-right scale-110">
                    <FollowButton
                      isFollowing={isFollowing}
                      targetUserId={typedProfile.id}
                      targetUsername={typedProfile.username}
                      path={`/u/${typedProfile.username}`}
                    />
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-4xl font-black tracking-tighter text-neutral-950 sm:text-5xl">
                    @{typedProfile.username}
                  </h1>
                </div>

                <p className="mt-2 text-sm text-neutral-500">
                  <Link href={`/u/${username}/followers`} className="hover:underline">
                    {followersCount} followers
                  </Link>
                    {" · "}
                  <Link href={`/u/${username}/following`} className="hover:underline">
                    {followingCount} following
                  </Link>
                </p>

                <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400">
                  Legacy started -{" "}
                  {legacyStartedLabel}
                </p>
              </div>

              <div className="w-full max-w-full rounded-[28px] border border-neutral-100 bg-neutral-50/70 px-2.5 py-3 sm:px-4 lg:mb-1 lg:w-[420px]">
                <div className="grid grid-cols-4 divide-x divide-neutral-200/70">
                  {heroStats.map((stat) => (
                    <div
                      key={stat.label}
                      className="min-w-0 px-1.5 text-center sm:px-3"
                    >
                      <p className="text-base font-black leading-none tabular-nums text-neutral-950 sm:text-lg">
                        {stat.value}
                      </p>
                      <p className="mt-1 whitespace-nowrap text-[8px] font-bold uppercase tracking-[0.06em] text-neutral-500 sm:text-[10px] sm:tracking-[0.1em] lg:text-[11px] lg:tracking-[0.08em]">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <ProfileBadgesSection
            badges={profileBadges}
            specialBadges={specialBadges}
            showProgress={isOwnProfile}
          />
        </div>

        <div className="mx-auto mt-10 max-w-2xl">
          <div className="mb-5 px-1">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-neutral-400">
              RECENT POSTS
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-neutral-950">
              Latest from @{typedProfile.username}
            </h2>
          </div>
          <UserProfileContent initialPosts={posts} />
        </div>
      </main>
    </div>
  );
}


