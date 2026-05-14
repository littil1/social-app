import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { resolvePostCommentCounts } from "@/features/comments/lib/post-comment-counts";
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
import LegendBadgeMarker from "@/features/badges/components/LegendBadgeMarker";
import { getIdeaCountByUserId } from "@/features/input/lib/feedback-data";

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

type PostBoostRow = {
  post_id: number;
  user_id: string;
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

function formatStatValue(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const supabase = await createClient();
  const paramsPromise = params;
  const userPromise = supabase.auth.getUser();
  const {
    data: { user },
  } = await userPromise;

  let viewerIsAdmin = false;

  if (user) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("username, avatar_url, is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      throw new Error(profileError.message);
    }

    viewerIsAdmin = profile?.is_admin ?? false;
  }

  const { username } = await paramsPromise;
  const usernameFromUrl = decodeURIComponent(username).trim().toLowerCase();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, bio, avatar_url, created_at, badges")
    .eq("username", usernameFromUrl)
    .maybeSingle();

  if (profileError || !profile) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <div className="rounded-[32px] border border-neutral-200 bg-white p-12 text-center shadow-sm">
          <h1 className="text-2xl font-black tracking-tight text-neutral-950">
            Profile not found
          </h1>
        </div>
      </main>
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
  const reactionCountMap = new Map<
    number,
    { like: number; funny: number; wow: number; fire: number }
  >();
  const viewerReactionMap = new Map<number, ReactionType | null>();
  const boostCountMap = new Map<number, number>();

  const commentCountPromise = resolvePostCommentCounts(supabase, typedPosts);
  const reactionsPromise =
    postIds.length > 0
      ? supabase
          .from("post_reactions")
          .select("post_id, user_id, reaction")
          .in("post_id", postIds)
      : Promise.resolve({ data: [], error: null });
  const boostsPromise =
    postIds.length > 0
      ? supabase.from("post_boosts").select("post_id, user_id").in("post_id", postIds)
      : Promise.resolve({ data: [], error: null });
  const followStatusPromise = isFollowingUser(
    supabase,
    user?.id ?? null,
    typedProfile.id
  );
  const followCountsPromise = getFollowCounts(supabase, typedProfile.id);
  const ideaCountPromise = getIdeaCountByUserId(supabase, typedProfile.id);
  const isOwnProfile = user?.id === typedProfile.id;
  const profileBadgesPromise = getComputedUserBadges(supabase, typedProfile.id, {
    includeProgress: isOwnProfile,
  });

  const [
    commentCountMap,
    { data: reactionsData, error: reactionsError },
    { data: boostsData, error: boostsError },
    isFollowing,
    { followersCount, followingCount },
    ideaCount,
    profileBadges,
  ] = await Promise.all([
    commentCountPromise,
    reactionsPromise,
    boostsPromise,
    followStatusPromise,
    followCountsPromise,
    ideaCountPromise,
    profileBadgesPromise,
  ]);

  if (reactionsError) {
    throw new Error(reactionsError.message);
  }

  if (boostsError) {
    throw new Error(boostsError.message);
  }

  if (postIds.length > 0) {
    for (const boost of (boostsData ?? []) as PostBoostRow[]) {
      boostCountMap.set(boost.post_id, (boostCountMap.get(boost.post_id) ?? 0) + 1);
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
    const boostCount = boostCountMap.get(post.id) ?? 0;

    return {
      id: post.id,
      content: post.content ?? "",
      created_at: post.created_at,
      comments_count: commentCountMap.get(post.id) ?? 0,
      boost_count: boostCount,
      viewer_has_boosted: false,
      viewer_boost_available_today: false,
      is_today_post: false,
      can_boost: false,
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

  const specialBadges = Array.isArray(typedProfile.badges)
    ? typedProfile.badges
        .map((badgeKey) => getProfileBadge(badgeKey))
        .filter((badge): badge is NonNullable<typeof badge> => badge !== null)
    : [];
  const badgeCount = profileBadges.length + specialBadges.length;
  const legendWins =
    profileBadges.find((badge) => badge.family === "legend")?.total.count ?? 0;
  const hasLegendBadge = legendWins > 0;
  const legacyStartedLabel = formatProfileMonth(typedProfile.created_at);
  const echoScore = posts.reduce(
    (total, post) =>
      total + post.reactions_count + post.comments_count * 2 + post.boost_count * 3,
    0
  );
  const heroStats = [
    { label: "ECHO", value: echoScore },
    { label: "Followers", value: followersCount, href: `/u/${username}/followers` },
    { label: "Following", value: followingCount, href: `/u/${username}/following` },
    { label: "Posts", value: posts.length },
    { label: "Ideas", value: ideaCount },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <main className="mx-auto max-w-5xl px-4 pb-32 pt-6 sm:py-14">
        <section className="overflow-hidden rounded-[34px] border border-neutral-200 bg-white shadow-[0_24px_70px_-48px_rgba(15,23,42,0.42)] sm:rounded-[40px]">
          <div className="relative h-36 overflow-hidden bg-neutral-950 sm:h-44">
            <div className="absolute right-0 top-0 h-full w-full bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.15),transparent_50%)]" />
            <div className="absolute bottom-0 left-0 h-full w-full bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.05),transparent_40%)]" />
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
          </div>

          <div className="relative px-5 pb-6 sm:px-8 sm:pb-8">
            <div className="relative -mt-20 mb-6 flex flex-col gap-5 sm:-mt-24 sm:flex-row sm:items-end sm:justify-between">
              <div className="relative">
                <div className="absolute inset-0 rounded-[36px] bg-amber-400/25 blur-2xl" />
                <div className="relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-[34px] border-[7px] border-white bg-neutral-100 text-5xl font-black text-neutral-400 shadow-[0_22px_52px_-28px_rgba(15,23,42,0.7)] ring-1 ring-amber-100/70 sm:h-40 sm:w-40 sm:rounded-[38px]">
                  {typedProfile.avatar_url ? (
                    <Image
                      src={typedProfile.avatar_url}
                      alt={`${typedProfile.username} avatar`}
                      width={160}
                      height={160}
                      sizes="(min-width: 640px) 160px, 128px"
                      priority
                      unoptimized
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    typedProfile.username.charAt(0).toUpperCase()
                  )}
                </div>
              </div>

              <div className="sm:mb-2">
                {isOwnProfile ? (
                  <Link
                    href="/settings/profile"
                    className="inline-flex items-center justify-center rounded-2xl border border-neutral-200 bg-white px-6 py-3 text-sm font-bold text-neutral-950 shadow-sm transition-all hover:scale-105 hover:bg-neutral-50 active:scale-95"
                  >
                    Edit Profile
                  </Link>
                ) : user ? (
                  <div className="origin-bottom-left sm:origin-bottom-right sm:scale-105">
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

            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-start">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="break-words text-4xl font-black tracking-tighter text-neutral-950 sm:text-5xl">
                    @{typedProfile.username}
                  </h1>
                  {hasLegendBadge && (
                    <LegendBadgeMarker className="text-xl sm:text-2xl" />
                  )}
                </div>

                <p className="mt-3 max-w-2xl text-[15px] font-medium leading-6 text-neutral-600">
                  {typedProfile.bio || "No bio yet."}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-neutral-400">
                  <span className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5">
                    Since {legacyStartedLabel}
                  </span>
                  {badgeCount > 0 && (
                    <span className="rounded-full border border-amber-100 bg-amber-50 px-3 py-1.5 text-amber-700">
                      {badgeCount} honors
                    </span>
                  )}
                </div>
              </div>

              <div className="w-full max-w-full rounded-[28px] border border-neutral-100 bg-neutral-50/80 p-2 shadow-inner lg:w-[560px]">
                <div className="overflow-x-auto rounded-[22px]">
                  <div className="grid min-w-[500px] grid-cols-5 divide-x divide-neutral-200/70 overflow-hidden rounded-[22px] bg-white/80 sm:min-w-0">
                  {heroStats.map((stat) => (
                    <Link
                      key={stat.label}
                      href={stat.href ?? `/u/${username}`}
                      className={`min-w-[96px] px-3 py-3 text-center sm:min-w-0 sm:px-4 ${
                        stat.href
                          ? "transition hover:bg-amber-50/70"
                          : "pointer-events-none"
                      }`}
                    >
                      <p className="text-base font-black leading-none tabular-nums text-neutral-950 sm:text-lg">
                        {formatStatValue(stat.value)}
                      </p>
                      <p className="mt-1 whitespace-nowrap text-[8px] font-bold uppercase tracking-[0.06em] text-neutral-500 sm:text-[10px] sm:tracking-[0.1em] lg:text-[11px] lg:tracking-[0.08em]">
                        {stat.label}
                      </p>
                    </Link>
                  ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-8">
          <ProfileBadgesSection
            badges={profileBadges}
            specialBadges={specialBadges}
            showProgress={isOwnProfile}
          />
        </div>

        <section className="mx-auto mt-10 max-w-2xl border-t border-neutral-200/70 pt-8">
          <div className="mb-5 px-1">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-neutral-400">
              RECENT POSTS
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-neutral-950">
              Latest from @{typedProfile.username}
            </h2>
          </div>
          <UserProfileContent initialPosts={posts} />
        </section>
      </main>
    </div>
  );
}
