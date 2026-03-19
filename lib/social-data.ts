import "server-only";

type ProfileRow = {
  id: string;
  username: string | null;
  avatar_url: string | null;
};

type PostRow = {
  id: number;
  content: string;
  user_id: string;
  created_at: string;
};

type LikeRow = {
  id: number;
  post_id: number;
  user_id: string;
  created_at: string;
};

type CommentRow = {
  id: number;
  post_id: number;
  user_id: string;
  content: string;
  created_at: string;
};

type FeatureRequestRow = {
  id: number;
  user_id: string;
  status: "open" | "implemented";
};

export type EnrichedComment = {
  id: number;
  post_id: number;
  user_id: string;
  content: string;
  created_at: string;
  username: string | null;
  avatar_url: string | null;
  isOwnComment: boolean;
};

export type EnrichedPost = {
  id: number;
  content: string;
  user_id: string;
  created_at: string;
  username: string | null;
  avatar_url: string | null;
  comments: EnrichedComment[];
  commentCount: number;
  likeCountToday: number;
  likeCountWeek: number;
  likedByViewer: boolean;
  implementedIdeaCount: number;
};

function getStartOfToday() {
  const now = new Date();
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0
  ).getTime();
}

function getStartOfWeek() {
  return Date.now() - 7 * 24 * 60 * 60 * 1000;
}

export function sortTrendingToday(posts: EnrichedPost[]) {
  return [...posts].sort((a, b) => {
    if (b.likeCountToday !== a.likeCountToday) {
      return b.likeCountToday - a.likeCountToday;
    }

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export function sortTrendingWeek(posts: EnrichedPost[]) {
  return [...posts].sort((a, b) => {
    if (b.likeCountWeek !== a.likeCountWeek) {
      return b.likeCountWeek - a.likeCountWeek;
    }

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export async function getPostsBundle(
  supabase: any,
  opts?: {
    viewerId?: string | null;
    userId?: string;
  }
): Promise<EnrichedPost[]> {
  let postsQuery = supabase
    .from("posts")
    .select("id, content, user_id, created_at")
    .order("created_at", { ascending: false });

  if (opts?.userId) {
    postsQuery = postsQuery.eq("user_id", opts.userId);
  }

  const { data: posts, error: postsError } = await postsQuery;
  if (postsError) throw new Error(postsError.message);

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, username, avatar_url");
  if (profilesError) throw new Error(profilesError.message);

  const { data: likes, error: likesError } = await supabase
    .from("likes")
    .select("id, post_id, user_id, created_at");
  if (likesError) throw new Error(likesError.message);

  const { data: comments, error: commentsError } = await supabase
    .from("comments")
    .select("id, post_id, user_id, content, created_at")
    .order("created_at", { ascending: true });
  if (commentsError) throw new Error(commentsError.message);

  const { data: featureRequests, error: featureRequestsError } = await supabase
    .from("feature_requests")
    .select("id, user_id, status")
    .eq("status", "implemented");
  if (featureRequestsError) throw new Error(featureRequestsError.message);

  const typedPosts = (posts ?? []) as PostRow[];
  const typedProfiles = (profiles ?? []) as ProfileRow[];
  const typedLikes = (likes ?? []) as LikeRow[];
  const typedComments = (comments ?? []) as CommentRow[];
  const typedFeatureRequests = (featureRequests ?? []) as FeatureRequestRow[];

  const startOfToday = getStartOfToday();
  const startOfWeek = getStartOfWeek();

  const profileMap = new Map<string, ProfileRow>(
    typedProfiles.map((profile) => [profile.id, profile])
  );

  const implementedIdeaCountByUser = new Map<string, number>();

  for (const request of typedFeatureRequests) {
    implementedIdeaCountByUser.set(
      request.user_id,
      (implementedIdeaCountByUser.get(request.user_id) ?? 0) + 1
    );
  }

  const commentsByPost = new Map<number, EnrichedComment[]>();

  for (const comment of typedComments) {
    const profile = profileMap.get(comment.user_id);

    const enrichedComment: EnrichedComment = {
      ...comment,
      username: profile?.username ?? null,
      avatar_url: profile?.avatar_url ?? null,
      isOwnComment: comment.user_id === opts?.viewerId,
    };

    const existing = commentsByPost.get(comment.post_id) ?? [];
    existing.push(enrichedComment);
    commentsByPost.set(comment.post_id, existing);
  }

  return typedPosts.map((post) => {
    const profile = profileMap.get(post.user_id);
    const postLikes = typedLikes.filter((like) => like.post_id === post.id);

    const likeCountToday = postLikes.filter(
      (like) => new Date(like.created_at).getTime() >= startOfToday
    ).length;

    const likeCountWeek = postLikes.filter(
      (like) => new Date(like.created_at).getTime() >= startOfWeek
    ).length;

    const likedByViewer = postLikes.some(
      (like) =>
        like.user_id === opts?.viewerId &&
        new Date(like.created_at).getTime() >= startOfToday
    );

    const postComments = commentsByPost.get(post.id) ?? [];

    return {
      ...post,
      username: profile?.username ?? null,
      avatar_url: profile?.avatar_url ?? null,
      comments: postComments,
      commentCount: postComments.length,
      likeCountToday,
      likeCountWeek,
      likedByViewer,
      implementedIdeaCount: implementedIdeaCountByUser.get(post.user_id) ?? 0,
    };
  });
}