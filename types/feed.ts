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
  created_at: string;
  reactions_count: number;
  reaction_counts: ReactionCounts;
  viewer_reaction: ReactionType | null;
  comments_count: number;
  can_delete: boolean;
  author_username?: string | null;
  author_avatar_url?: string | null;
};

export type FeedComment = {
  id: number;
  content: string;
  created_at: string;
  parent_id: number | null;
  reactions_count: number;
  reaction_counts: ReactionCounts;
  viewer_reaction: ReactionType | null;
  can_delete: boolean;
  author_username?: string | null;
  author_avatar_url?: string | null;
  author_hall_of_fame_count?: number;
  author_hall_of_fame_categories?: string[];
};