import "server-only";

export type FeedbackComment = {
  id: number;
  feature_request_id: number;
  user_id: string;
  content: string;
  created_at: string;
  username: string | null;
  avatar_url: string | null;
  isOwnComment: boolean;
};

export type FeedbackItem = {
  id: number;
  title: string;
  description: string;
  user_id: string;
  status: "open" | "implemented";
  implemented_at: string | null;
  created_at: string;
  username: string | null;
  avatar_url: string | null;
  likeCount: number;
  likedByViewer: boolean;
  comments: FeedbackComment[];
  commentCount: number;
};

type ProfileRow = {
  id: string;
  username: string | null;
  avatar_url: string | null;
};

type FeatureRequestRow = {
  id: number;
  title: string;
  description: string;
  user_id: string;
  status: "open" | "implemented";
  implemented_at: string | null;
  created_at: string;
};

type FeatureRequestLikeRow = {
  id: number;
  feature_request_id: number;
  user_id: string;
  created_at: string;
};

type FeatureRequestCommentRow = {
  id: number;
  feature_request_id: number;
  user_id: string;
  content: string;
  created_at: string;
};

export async function getFeedbackBundle(
  supabase: any,
  viewerId?: string | null
): Promise<FeedbackItem[]> {
  const { data: requests, error: requestsError } = await supabase
    .from("feature_requests")
    .select("id, title, description, user_id, status, implemented_at, created_at")
    .order("created_at", { ascending: false });

  if (requestsError) throw new Error(requestsError.message);

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, username, avatar_url");

  if (profilesError) throw new Error(profilesError.message);

  const { data: likes, error: likesError } = await supabase
    .from("feature_request_likes")
    .select("id, feature_request_id, user_id, created_at");

  if (likesError) throw new Error(likesError.message);

  const { data: comments, error: commentsError } = await supabase
    .from("feature_request_comments")
    .select("id, feature_request_id, user_id, content, created_at")
    .order("created_at", { ascending: true });

  if (commentsError) throw new Error(commentsError.message);

  const typedRequests = (requests ?? []) as FeatureRequestRow[];
  const typedProfiles = (profiles ?? []) as ProfileRow[];
  const typedLikes = (likes ?? []) as FeatureRequestLikeRow[];
  const typedComments = (comments ?? []) as FeatureRequestCommentRow[];

  const profileMap = new Map<string, ProfileRow>(
    typedProfiles.map((profile) => [profile.id, profile])
  );

  const commentsByRequest = new Map<number, FeedbackComment[]>();

  for (const comment of typedComments) {
    const profile = profileMap.get(comment.user_id);

    const enrichedComment: FeedbackComment = {
      ...comment,
      username: profile?.username ?? null,
      avatar_url: profile?.avatar_url ?? null,
      isOwnComment: comment.user_id === viewerId,
    };

    const existing = commentsByRequest.get(comment.feature_request_id) ?? [];
    existing.push(enrichedComment);
    commentsByRequest.set(comment.feature_request_id, existing);
  }

  return typedRequests
    .map((request) => {
      const profile = profileMap.get(request.user_id);
      const requestLikes = typedLikes.filter(
        (like) => like.feature_request_id === request.id
      );
      const requestComments = commentsByRequest.get(request.id) ?? [];

      return {
        ...request,
        username: profile?.username ?? null,
        avatar_url: profile?.avatar_url ?? null,
        likeCount: requestLikes.length,
        likedByViewer: requestLikes.some((like) => like.user_id === viewerId),
        comments: requestComments,
        commentCount: requestComments.length,
      };
    })
    .sort((a, b) => {
      if (b.likeCount !== a.likeCount) {
        return b.likeCount - a.likeCount;
      }

      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
}

export async function getImplementedIdeaCountByUserId(
  supabase: any,
  userId: string
) {
  const { count, error } = await supabase
    .from("feature_requests")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "implemented");

  if (error) throw new Error(error.message);

  return count ?? 0;
}