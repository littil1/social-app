import type { ReactionCounts, ReactionType } from "@/shared/types/feed";

export type OptimisticPostReactionStatus = "pending" | "rollback";

export type OptimisticPostReactionMeta = {
  status: OptimisticPostReactionStatus;
};

export type PostReactionTarget = {
  viewer_reaction: ReactionType | null;
  reaction_counts: ReactionCounts;
  reactions_count: number;
  comments_count: number;
  boost_count: number;
  relevance_score?: number;
};

export type PostBoostTarget = PostReactionTarget & {
  id: number;
  is_today_post: boolean;
  viewer_has_boosted: boolean;
  viewer_boost_available_today: boolean;
  can_boost: boolean;
};

function getReactionDelta(
  previousReaction: ReactionType | null,
  nextReaction: ReactionType | null
) {
  if (previousReaction === nextReaction) return 0;
  if (previousReaction && nextReaction) return 0;
  return nextReaction ? 1 : -1;
}

export function getOptimisticBaseScore(post: {
  reactions_count: number;
  comments_count: number;
  boost_count: number;
}) {
  return post.reactions_count + post.comments_count * 2 + post.boost_count * 3;
}

export function applyOptimisticPostReaction<TPost extends PostReactionTarget>(
  post: TPost,
  nextReaction: ReactionType | null
): TPost {
  const previousReaction = post.viewer_reaction;
  if (previousReaction === nextReaction) return post;

  const reactionCounts = { ...post.reaction_counts };
  const reactionDelta = getReactionDelta(previousReaction, nextReaction);
  const reactionsCount = Math.max(0, post.reactions_count + reactionDelta);

  if (previousReaction) {
    reactionCounts[previousReaction] = Math.max(
      0,
      reactionCounts[previousReaction] - 1
    );
  }

  if (nextReaction) {
    reactionCounts[nextReaction] += 1;
  }

  return {
    ...post,
    viewer_reaction: nextReaction,
    reaction_counts: reactionCounts,
    reactions_count: reactionsCount,
    relevance_score:
      typeof post.relevance_score === "number"
        ? Math.max(0, post.relevance_score + reactionDelta)
        : post.relevance_score,
  };
}

export function applyOptimisticPostBoost<TPost extends PostBoostTarget>(
  post: TPost,
  boostedPostId: number,
  boostCount: number
): TPost {
  if (!post.is_today_post) {
    return post;
  }

  const previousBoostCount = post.boost_count;
  const nextBoostCount = post.id === boostedPostId ? boostCount : post.boost_count;
  const boostDelta = (nextBoostCount - previousBoostCount) * 3;

  return {
    ...post,
    boost_count: nextBoostCount,
    viewer_has_boosted: post.id === boostedPostId,
    viewer_boost_available_today: false,
    can_boost: post.id === boostedPostId,
    relevance_score:
      typeof post.relevance_score === "number"
        ? Math.max(0, post.relevance_score + boostDelta)
        : post.relevance_score,
  };
}
