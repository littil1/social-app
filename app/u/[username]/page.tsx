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

type HallOfFameRow = Database["public"]["Tables"]["weekly_post_hall_of_fame"]["Row"];

export default async function ProfilePage({ params }: ProfilePageProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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

    if (profileError) throw new Error(profileError.message);

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

    if (viewerProfileError) throw new Error(viewerProfileError.message);
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
          <div className="rounded-[32px] bg-white p-12 text-center border border-neutral-200 shadow-sm">
            <h1 className="text-2xl font-black tracking-tight text-neutral-950">Profile not found</h1>
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

  if (postsError) throw new Error(postsError.message);

  const typedPosts = (postsData ?? []) as PostRow[];
  const postIds = typedPosts.map((post) => post.id);

  const commentCountMap = new Map<number, number>();
  if (postIds.length > 0) {
    const { data: commentsData, error: commentsError } = await supabase
      .from("comments")
      .select("post_id")
      .in("post_id", postIds);

    if (commentsError) throw new Error(commentsError.message);

    for (const comment of (commentsData ?? []) as CommentRow[]) {
      if (typeof comment.post_id !== "number") continue;
      commentCountMap.set(comment.post_id, (commentCountMap.get(comment.post_id) ?? 0) + 1);
    }
  }

  const reactionCountMap = new Map<number, { like: number; funny: number; wow: number; fire: number; }>();
  const viewerReactionMap = new Map<number, ReactionType | null>();

  if (postIds.length > 0) {
    const { data: reactionsData, error: reactionsError } = await supabase
      .from("post_reactions")
      .select("post_id, user_id, reaction")
      .in("post_id", postIds);

    if (reactionsError) throw new Error(reactionsError.message);

    for (const reaction of (reactionsData ?? []) as PostReactionRow[]) {
      const current = reactionCountMap.get(reaction.post_id) ?? { like: 0, funny: 0, wow: 0, fire: 0 };
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
    const reactionCounts = reactionCountMap.get(post.id) ?? { like: 0, funny: 0, wow: 0, fire: 0 };
    return {
      id: post.id,
      content: post.content ?? "",
      created_at: post.created_at,
      comments_count: commentCountMap.get(post.id) ?? post.comments_count ?? 0,
      reactions_count: reactionCounts.like + reactionCounts.funny + reactionCounts.wow + reactionCounts.fire,
      reaction_counts: reactionCounts,
      viewer_reaction: viewerReactionMap.get(post.id) ?? null,
      can_delete: !!user && (post.user_id === user.id || viewerIsAdmin),
      author_username: profile.username,
      author_avatar_url: profile.avatar_url ?? null,
    };
  });

  const { followersCount, followingCount } = await getFollowCounts(supabase, profile.id);
  const isFollowing = await isFollowingUser(supabase, user?.id ?? null, profile.id);
  const implementedIdeaCount = await getImplementedIdeaCountByUserId(supabase, profile.id);

  const { data: hallOfFameData, error: hallOfFameError } = await supabase
    .from("weekly_post_hall_of_fame")
    .select("*")
    .eq("author_id", profile.id)
    .order("week_start", { ascending: false });

  if (hallOfFameError) throw new Error(hallOfFameError.message);
  const hallOfFameCount = (hallOfFameData ?? []).length;

  const isOwnProfile = user?.id === profile.id;
  const profileBadges = Array.isArray(profile.badges)
    ? profile.badges.filter((value): value is string => typeof value === "string")
    : [];

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <NavBar user={navUser} />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:py-16">
        <div className="mb-8 overflow-hidden rounded-[40px] border border-neutral-200 bg-white shadow-[0_20px_50px_-20px_rgba(0,0,0,0.05)]">
          <div className="h-32 bg-neutral-950 relative overflow-hidden">
             <div className="absolute right-0 top-0 h-full w-full bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.15),transparent_50%)]" />
             <div className="absolute left-0 bottom-0 h-full w-full bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.05),transparent_40%)]" />
             <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
          </div>

          <div className="relative px-6 pb-10 sm:px-10">
            <div className="relative -mt-16 mb-8 flex items-end justify-between gap-4">
              <div className="relative">
                <div className="absolute inset-0 rounded-[32px] bg-amber-400/20 blur-2xl" />
                <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-[32px] border-[6px] border-white bg-neutral-100 text-4xl font-black text-neutral-400 shadow-xl sm:h-36 sm:w-36">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={`${profile.username} avatar`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    profile.username.charAt(0).toUpperCase()
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
                  <div className="scale-110 origin-bottom-right">
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

            <div className="space-y-6">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-4xl font-black tracking-tighter text-neutral-950 sm:text-5xl">
                    @ {profile.username}
                  </h1>
                  
                  <div className="flex gap-2">
                    {implementedIdeaCount > 0 && (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-amber-700 shadow-sm">
                        Contributor
                      </span>
                    )}

                    {hallOfFameCount > 0 && (
                      <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-indigo-700 shadow-sm">
                        Legend
                      </span>
                    )}
                  </div>
                </div>
                
                <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400">
                  Legacy started · {new Date(profile.created_at).toLocaleDateString("en-GB", { month: 'long', year: 'numeric' })}
                </p>
              </div>

              {(implementedIdeaCount > 0 || hallOfFameCount > 0) && (
                <div className="grid grid-cols-2 gap-4 pt-2">
                  {implementedIdeaCount > 0 && (
                    <div className="group flex flex-col rounded-3xl border border-amber-100 bg-amber-50/30 p-4 transition-colors hover:bg-amber-50">
                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-600/60">Community Impact</span>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-xl">💡</span>
                        <span className="text-xl font-black text-amber-900">
                          {implementedIdeaCount} {implementedIdeaCount === 1 ? "Idea" : "Ideas"}
                        </span>
                      </div>
                    </div>
                  )}
                  {hallOfFameCount > 0 && (
                    <div className="group flex flex-col rounded-3xl border border-indigo-100 bg-indigo-50/30 p-4 transition-colors hover:bg-indigo-50">
                      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600/60">Victories</span>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-xl">🏆</span>
                        <span className="text-xl font-black text-indigo-900">
                          {hallOfFameCount} {hallOfFameCount === 1 ? "Legendary Win" : "Legendary Wins"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-6 border-t border-neutral-100">
                <p className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Earned Badges</p>
                <ProfileBadgesSection
                  targetUserId={profile.id}
                  initialBadges={profileBadges}
                  viewerIsAdmin={viewerIsAdmin}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12">
          <UserProfileContent
            initialPosts={posts}
            followersCount={followersCount}
            followingCount={followingCount}
            username={profile.username}
          />
        </div>
      </main>
    </div>
  );
}