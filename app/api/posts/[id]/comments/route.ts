import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/shared/types/database";
import type {
  FeedComment,
  FeedCommentBadge,
  ReactionCounts,
  ReactionType,
} from "@/shared/types/feed";
import { safeRecomputeUserBadgeFamiliesWithAdmin } from "@/features/badges/lib/server";
import { getUserBadges } from "@/features/badges/lib/getUserBadges";
import {
  checkRateLimit,
  getActorRateLimitKey,
  RATE_LIMIT_MESSAGE,
} from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type CommentRow = Database["public"]["Tables"]["comments"]["Row"];
type CommentReactionRow =
  Database["public"]["Tables"]["comment_reactions"]["Row"];

type CommentListRow = Pick<
  CommentRow,
  "id" | "content" | "created_at" | "user_id" | "parent_id" | "deleted_at"
>;

type CommentReactionListRow = Pick<
  CommentReactionRow,
  "comment_id" | "user_id" | "reaction"
>;

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

function toFeedCommentBadges(
  badges: Awaited<ReturnType<typeof getUserBadges>> extends Map<string, infer T>
    ? T
    : never
): FeedCommentBadge[] {
  return (badges ?? []).map((badge) => ({
    key: badge.key,
    family: badge.family,
    label: badge.label,
    icon: badge.icon,
    description: badge.description,
    className: badge.className,
  }));
}

function normalizeDeletedComment(comment: FeedComment): FeedComment {
  if (!comment.deleted_at && !comment.is_deleted) {
    return comment;
  }

  return {
    ...comment,
    content: "",
    deleted_at: comment.deleted_at ?? new Date(0).toISOString(),
    is_deleted: true,
    reactions_count: 0,
    reaction_counts: createEmptyReactionCounts(),
    viewer_reaction: null,
    can_delete: false,
  };
}

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const postId = Number(id);

    if (!Number.isFinite(postId)) {
      return new NextResponse("Invalid post id.", { status: 400 });
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    let viewerIsAdmin = false;

    if (user) {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        return new NextResponse("Comments could not be loaded.", { status: 500 });
      }

      viewerIsAdmin = profileData?.is_admin ?? false;
    }

    const { data, error } = await supabase
      .from("comments")
      .select("id, content, created_at, user_id, parent_id, deleted_at")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) {
      return new NextResponse("Comments could not be loaded.", { status: 500 });
    }

    const commentRows = (data ?? []) as CommentListRow[];
    const commentIds = commentRows.map((comment) => comment.id);

    const authorIds = Array.from(
      new Set(
        commentRows
          .map((comment) => comment.user_id)
          .filter((userId): userId is string => typeof userId === "string")
      )
    );

    let profilesById = new Map<string, ProfileRow>();

    if (authorIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, bio, created_at, updated_at, is_admin")
        .in("id", authorIds);

      if (profilesError) {
        return new NextResponse("Comments could not be loaded.", { status: 500 });
      }

      const profiles = (profilesData ?? []) as ProfileRow[];
      profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
    }

    const reactionCountsByCommentId = new Map<number, ReactionCounts>();
    const viewerReactionByCommentId = new Map<number, ReactionType>();

    if (commentIds.length > 0) {
      const { data: commentReactionsData, error: commentReactionsError } =
        await supabase
          .from("comment_reactions")
          .select("comment_id, user_id, reaction")
          .in("comment_id", commentIds);

      if (commentReactionsError) {
        return new NextResponse("Comments could not be loaded.", { status: 500 });
      }

      const commentReactions =
        (commentReactionsData ?? []) as CommentReactionListRow[];

      for (const reaction of commentReactions) {
        const counts =
          reactionCountsByCommentId.get(reaction.comment_id) ??
          createEmptyReactionCounts();

        counts[reaction.reaction as ReactionType] += 1;
        reactionCountsByCommentId.set(reaction.comment_id, counts);

        if (user && reaction.user_id === user.id) {
          viewerReactionByCommentId.set(
            reaction.comment_id,
            reaction.reaction as ReactionType
          );
        }
      }
    }

    const badgesMap = await getUserBadges(authorIds);

    const comments: FeedComment[] = commentRows.map((comment) => {
      const profile =
        comment.user_id ? profilesById.get(comment.user_id) ?? null : null;
      const isDeleted = !!comment.deleted_at;

      const reactionCounts = isDeleted
        ? createEmptyReactionCounts()
        : reactionCountsByCommentId.get(comment.id) ?? createEmptyReactionCounts();

      const authorBadges = comment.user_id
        ? toFeedCommentBadges(badgesMap.get(comment.user_id) ?? [])
        : [];

      return normalizeDeletedComment({
        id: comment.id,
        content: isDeleted ? "" : comment.content,
        created_at: comment.created_at,
        deleted_at: comment.deleted_at ?? null,
        is_deleted: isDeleted,
        parent_id: comment.parent_id ?? null,
        reactions_count: isDeleted ? 0 : getReactionsCount(reactionCounts),
        reaction_counts: reactionCounts,
        viewer_reaction: isDeleted
          ? null
          : viewerReactionByCommentId.get(comment.id) ?? null,
        can_delete:
          !isDeleted &&
          !!user &&
          (comment.user_id === user.id || viewerIsAdmin),
        author_username: profile?.username ?? null,
        author_avatar_url: profile?.avatar_url ?? null,
        author_hall_of_fame_count: 0,
        author_hall_of_fame_categories: [],
        author_badges: authorBadges,
      });
    });

    return NextResponse.json(comments, {
      headers: NO_STORE_HEADERS,
    });
  } catch (error) {
    console.error(error);
    return new NextResponse("Comments could not be loaded.", {
      status: 500,
    });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const postId = Number(id);

    if (!Number.isFinite(postId)) {
      return new NextResponse("Invalid post id.", { status: 400 });
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse("Not signed in.", { status: 401 });
    }

    const rateLimit = checkRateLimit({
      key: await getActorRateLimitKey("create-comment", user.id),
      limit: 20,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return new NextResponse(RATE_LIMIT_MESSAGE, { status: 429 });
    }

    const body = await request.json().catch(() => null);
    const content = String(body?.content ?? "").trim();
    const rawParentId = body?.parentId;

    let parentId: number | null = null;

    if (
      rawParentId !== undefined &&
      rawParentId !== null &&
      rawParentId !== ""
    ) {
      const parsedParentId = Number(rawParentId);

      if (!Number.isFinite(parsedParentId)) {
        return new NextResponse("Invalid parent comment id.", {
          status: 400,
        });
      }

      parentId = parsedParentId;
    }

    if (!content) {
      return new NextResponse("Write a comment before sending.", { status: 400 });
    }

    if (content.length > 200) {
      return new NextResponse("Your comment is too long. Shorten it and try again.", {
        status: 400,
      });
    }

    if (parentId !== null) {
      const { data: parentComment, error: parentError } = await supabase
        .from("comments")
        .select("id, post_id")
        .eq("id", parentId)
        .maybeSingle();

      if (parentError) {
        return new NextResponse("Comment could not be saved.", { status: 500 });
      }

      if (!parentComment || parentComment.post_id !== postId) {
        return new NextResponse(
          "Replies can only be created for comments on this post.",
          { status: 400 }
        );
      }
    }

    const { data: postData, error: postError } = await supabase
      .from("posts")
      .select("user_id")
      .eq("id", postId)
      .maybeSingle();

    if (postError) {
      return new NextResponse("Comment could not be saved.", { status: 500 });
    }

    if (!postData) {
      return new NextResponse("Post not found.", { status: 404 });
    }

    const { data: insertedComment, error: insertError } = await supabase
      .from("comments")
      .insert({
        post_id: postId,
        user_id: user.id,
        content,
        parent_id: parentId,
      })
      .select("id, content, created_at, user_id, parent_id, deleted_at")
      .single();

    if (insertError || !insertedComment) {
      console.error(insertError);
      return new NextResponse("Comment could not be saved.", { status: 500 });
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return new NextResponse("Comment could not be saved.", { status: 500 });
    }

    const badgesMap = await getUserBadges([user.id]);
    const authorBadges = toFeedCommentBadges(badgesMap.get(user.id) ?? []);

    const response: FeedComment = {
      id: insertedComment.id,
      content: insertedComment.content,
      created_at: insertedComment.created_at,
      deleted_at: insertedComment.deleted_at ?? null,
      is_deleted: false,
      parent_id: insertedComment.parent_id ?? null,
      reactions_count: 0,
      reaction_counts: createEmptyReactionCounts(),
      viewer_reaction: null,
      can_delete: true,
      author_username: profileData?.username ?? null,
      author_avatar_url: profileData?.avatar_url ?? null,
      author_badges: authorBadges,
      author_hall_of_fame_count: 0,
      author_hall_of_fame_categories: [],
    };

    await safeRecomputeUserBadgeFamiliesWithAdmin(
      user.id,
      ["top_commentator"],
      "post-comment:create-author"
    );

    if (postData.user_id) {
      await safeRecomputeUserBadgeFamiliesWithAdmin(
        postData.user_id,
        ["most_discussed"],
        "post-comment:create-post-author"
      );
    }

    return NextResponse.json(response, {
      headers: NO_STORE_HEADERS,
    });
  } catch (error) {
    console.error(error);
    return new NextResponse("Comment could not be saved.", {
      status: 500,
    });
  }
}


