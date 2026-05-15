import Link from "next/link";
import { notFound } from "next/navigation";
import SinglePostView from "@/features/posts/components/SinglePostView";
import { resolvePostCommentCounts } from "@/features/comments/lib/post-comment-counts";
import { createClient } from "@/lib/supabase/server";
import { getZurichDayRange } from "@/features/winners/lib/daily-ranking";
import type { FeedPost, ReactionCounts, ReactionType } from "@/shared/types/feed";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// =====================================================
// Types
// =====================================================

type PageProps = {
  params: Promise<{ id: string }>;
};

type PostRow = {
  id: number;
  content: string | null;
  created_at: string;
  user_id: string | null;
  comments_count: number | null;
  moderation_status: FeedPost["moderation_status"];
};

type ProfileRow = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  is_admin?: boolean | null;
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

// =====================================================
// Helpers
// =====================================================

function createEmptyReactionCounts(): ReactionCounts {
  return {
    like: 0,
    funny: 0,
    wow: 0,
    fire: 0,
  };
}

function getReactionsCount(counts: ReactionCounts) {
  return counts.like + counts.funny + counts.wow + counts.fire;
}

// =====================================================
// Page
// =====================================================

export default async function PostDetailPage({ params }: PageProps) {
  // =====================================================
  // Params
  // =====================================================

  const { id } = await params;
  const postId = Number(id);

  if (!Number.isFinite(postId)) {
    notFound();
  }

  // =====================================================
  // Auth / Viewer Permissions
  // =====================================================

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let viewerIsAdmin = false;

  if (user) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      throw new Error(profileError.message);
    }

    const typedProfile = (profile ?? null) as ProfileRow | null;

    viewerIsAdmin = typedProfile?.is_admin ?? false;

  }

  // =====================================================
  // Load Post
  // =====================================================

  const { data: postData, error: postError } = await supabase
    .from("posts")
    .select("id, content, created_at, user_id, comments_count, moderation_status")
    .eq("id", postId)
    .maybeSingle();

  if (postError) {
    throw new Error(postError.message);
  }

  if (!postData) {
    notFound();
  }

  const post = postData as PostRow;
  const commentCountMap = await resolvePostCommentCounts(supabase, [post]);

  // =====================================================
  // Load Reactions / Comments
  // =====================================================

  const reactionCounts = createEmptyReactionCounts();
  let viewerReaction: ReactionType | null = null;
  let boostCount = 0;
  let viewerBoostedPostId: number | null = null;
  const { dayKey, startIso, endIso } = getZurichDayRange(new Date());
  const isTodayPost =
    new Date(post.created_at).getTime() >= new Date(startIso).getTime() &&
    new Date(post.created_at).getTime() < new Date(endIso).getTime();

  const [reactionsResult, boostsResult, viewerBoostResult] = await Promise.all([
    supabase
      .from("post_reactions")
      .select("post_id, user_id, reaction")
      .eq("post_id", postId),
    supabase
      .from("post_boosts")
      .select("post_id, user_id")
      .eq("post_id", postId),
    user
      ? supabase
          .from("post_boosts")
          .select("post_id")
          .eq("user_id", user.id)
          .eq("day_key", dayKey)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (reactionsResult.error) {
    throw new Error(reactionsResult.error.message);
  }

  if (boostsResult.error) {
    throw new Error(boostsResult.error.message);
  }

  if (viewerBoostResult.error) {
    throw new Error(viewerBoostResult.error.message);
  }

  for (const reaction of (reactionsResult.data ?? []) as PostReactionRow[]) {
    reactionCounts[reaction.reaction] += 1;

    if (user && reaction.user_id === user.id) {
      viewerReaction = reaction.reaction;
    }
  }

  boostCount = ((boostsResult.data ?? []) as PostBoostRow[]).length;
  viewerBoostedPostId = viewerBoostResult.data?.post_id ?? null;

  // =====================================================
  // Build Feed Post
  // =====================================================

  const initialPost: FeedPost = {
    id: post.id,
    content: post.content ?? "",
    moderation_status: post.moderation_status ?? "clean",
    created_at: post.created_at,
    reactions_count: getReactionsCount(reactionCounts),
    boost_count: boostCount,
    viewer_has_boosted: viewerBoostedPostId === post.id,
    viewer_boost_available_today: viewerBoostedPostId === null,
    is_today_post: isTodayPost,
    can_boost:
      isTodayPost &&
      (viewerBoostedPostId === post.id || viewerBoostedPostId === null),
    reaction_counts: reactionCounts,
    viewer_reaction: viewerReaction,
    comments_count: commentCountMap.get(post.id) ?? 0,
    can_delete: !!user && (post.user_id === user.id || viewerIsAdmin),
    author_username: null,
    author_avatar_url: null,
  };

  // =====================================================
  // Render
  // =====================================================

  return (
    <main className="mx-auto max-w-2xl p-6">
      {!user && (
        <div className="mb-6 rounded-xl bg-white p-4 shadow">
          <p className="mb-3 text-gray-700">
            You need to be signed in to interact.
          </p>
          <Link
            href="/login"
            className="inline-block rounded-lg bg-black px-4 py-2 text-white"
          >
            Sign In / Register
          </Link>
        </div>
      )}

      <SinglePostView initialPost={initialPost} />
    </main>
  );
}


