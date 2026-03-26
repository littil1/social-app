export type FeedPost = {
  id: number;
  content: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  viewer_has_liked: boolean;
  can_delete: boolean;
  author_username?: string | null;
  author_avatar_url?: string | null;
};

export type FeedComment = {
  id: number;
  content: string;
  created_at: string;
  parent_id: number | null;
  likes_count: number;
  viewer_has_liked: boolean;
  can_delete: boolean;
  author_username?: string | null;
  author_avatar_url?: string | null;
  author_hall_of_fame_count?: number;
  author_hall_of_fame_categories?: string[];
};