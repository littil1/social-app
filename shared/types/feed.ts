export type ReactionType = "like" | "funny" | "wow" | "fire";

export type ReactionCounts = {
  like: number;
  funny: number;
  wow: number;
  fire: number;
};

export type FeedPost = {
  id: number;
  content: string;
  moderation_status: "clean" | "reported" | "blurred" | "removed";
  created_at: string;
  comments_count: number;
  reactions_count: number;
  boost_count: number;
  viewer_has_boosted: boolean;
  viewer_boost_available_today: boolean;
  is_today_post: boolean;
  can_boost: boolean;
  reaction_counts: ReactionCounts;
  viewer_reaction: ReactionType | null;
  can_delete: boolean;
  author_username: string | null;
  author_avatar_url: string | null;
  relevance_score?: number;
};

export type FeedResponse = {
  posts: FeedPost[];
  hasMore: boolean;
};

export type HomeFeedData = {
  topThreeToday: FeedPost[];
  todayFeed: FeedPost[];
  olderFeed: FeedPost[];
  olderHasMore: boolean;
};

export type FeedCommentBadge = {
  key: string;
  family: string;
  label: string;
  icon: string;
  description: string;
  className: string;
};

export type FeedComment = {
  id: number;
  content: string;
  moderation_status: "clean" | "reported" | "blurred" | "removed";
  created_at: string;
  deleted_at: string | null;
  is_deleted: boolean;
  parent_id: number | null;
  reactions_count: number;
  reaction_counts: ReactionCounts;
  viewer_reaction: ReactionType | null;
  can_delete: boolean;
  author_username: string | null;
  author_avatar_url: string | null;

  // Legacy-Felder vorerst beibehalten, damit nichts anderes bricht
  author_hall_of_fame_count?: number;
  author_hall_of_fame_categories?: string[];

  // Neues System
  author_badges?: FeedCommentBadge[];
};
