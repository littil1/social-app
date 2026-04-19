import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import type { Database } from "@/types/database";
import type {
  FeedComment,
  FeedCommentBadge,
  ReactionCounts,
  ReactionType,
} from "@/types/feed";
import { getUserBadges } from "@/lib/badges/getUserBadges";

// =====================================================
// Types
// =====================================================

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type CommentRow = Database["public"]["Tables"]["comments"]["Row"];
type CommentReactionRow =
  Database["public"]["Tables"]["comment_reactions"]["Row"];

type CommentListRow = Pick<
  CommentRow,
  "id" | "content" | "created_at" | "user_id" | "parent_id"
>;

type CommentReactionListRow = Pick<
  CommentReactionRow,
  "comment_id" | "user_id" | "reaction"
>;

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

function toFeedCommentBadges(
  badges: Awaited<ReturnType<typeof getUserBadges>> extends Map<
    string,
    infer T
  >
    ? T
    : never
): FeedCommentBadge[] {
  return (badges ?? []).map((badge) => ({
    key: badge.key,
    label: badge.label,
    icon: badge.icon,
    description: badge.description,
    className: badge.className,
  }));
}

// =====================================================
// GET
// =====================================================

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const postId = Number(id);

    if (!Number.isFinite(postId)) {
      return new NextResponse("Ungültige Post-ID.", { status: 400 });
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
        return new NextResponse(profileError.message, { status: 500 });
      }

      viewerIsAdmin = profileData?.is_admin ?? false;
    }

    const { data, error } = await supabase
      .from("comments")
      .select("id, content, created_at, user_id, parent_id")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) {
      return new NextResponse(error.message, { status: 500 });
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
        return new NextResponse(profilesError.message, { status: 500 });
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
        return new NextResponse(commentReactionsError.message, { status: 500 });
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

    const badgesMap = await getUserBadges(authorIds, { limitPerUser: 3 });

    const comments: FeedComment[] = commentRows.map((comment) => {
      const profile =
        comment.user_id ? profilesById.get(comment.user_id) ?? null : null;

      const reactionCounts =
        reactionCountsByCommentId.get(comment.id) ?? createEmptyReactionCounts();

      const authorBadges = comment.user_id
        ? toFeedCommentBadges(badgesMap.get(comment.user_id) ?? [])
        : [];

      return {
        id: comment.id,
        content: comment.content,
        created_at: comment.created_at,
        parent_id: comment.parent_id ?? null,
        reactions_count: getReactionsCount(reactionCounts),
        reaction_counts: reactionCounts,
        viewer_reaction: viewerReactionByCommentId.get(comment.id) ?? null,
        can_delete: !!user && (comment.user_id === user.id || viewerIsAdmin),
        author_username: profile?.username ?? null,
        author_avatar_url: profile?.avatar_url ?? null,

        // Legacy safe
        author_hall_of_fame_count: 0,
        author_hall_of_fame_categories: [],

        // New badge system
        author_badges: authorBadges,
      };
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error(error);
    return new NextResponse("Kommentare konnten nicht geladen werden.", {
      status: 500,
    });
  }
}

// =====================================================
// POST
// =====================================================

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const postId = Number(id);

    if (!Number.isFinite(postId)) {
      return new NextResponse("Ungültige Post-ID.", { status: 400 });
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse("Nicht eingeloggt.", { status: 401 });
    }

    const body = await request.json();
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
        return new NextResponse("Ungültige Parent-Kommentar-ID.", {
          status: 400,
        });
      }

      parentId = parsedParentId;
    }

    if (!content) {
      return new NextResponse("Kommentar-Inhalt fehlt.", { status: 400 });
    }

    if (content.length > 200) {
      return new NextResponse("Kommentar ist zu lang.", { status: 400 });
    }

    if (parentId !== null) {
      const { data: parentComment, error: parentError } = await supabase
        .from("comments")
        .select("id, post_id")
        .eq("id", parentId)
        .maybeSingle();

      if (parentError) {
        return new NextResponse(parentError.message, { status: 500 });
      }

      if (!parentComment || parentComment.post_id !== postId) {
        return new NextResponse(
          "Antwort kann nur auf einen Kommentar dieses Posts erstellt werden.",
          { status: 400 }
        );
      }
    }

    const { data: insertedComment, error: insertError } = await supabase
      .from("comments")
      .insert({
        post_id: postId,
        user_id: user.id,
        content,
        parent_id: parentId,
      })
      .select("id, content, created_at, user_id, parent_id")
      .single();

    if (insertError || !insertedComment) {
      return new NextResponse(
        insertError?.message ?? "Kommentar konnte nicht erstellt werden.",
        {
          status: 500,
        }
      );
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return new NextResponse(profileError.message, { status: 500 });
    }

    const badgesMap = await getUserBadges([user.id], { limitPerUser: 3 });
    const authorBadges = toFeedCommentBadges(badgesMap.get(user.id) ?? []);

    const response: FeedComment = {
      id: insertedComment.id,
      content: insertedComment.content,
      created_at: insertedComment.created_at,
      parent_id: insertedComment.parent_id ?? null,
      reactions_count: 0,
      reaction_counts: createEmptyReactionCounts(),
      viewer_reaction: null,
      can_delete: true,
      author_username: profileData?.username ?? null,
      author_avatar_url: profileData?.avatar_url ?? null,

      // New badge system
      author_badges: authorBadges,

      // Legacy safe
      author_hall_of_fame_count: 0,
      author_hall_of_fame_categories: [],
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(error);
    return new NextResponse("Kommentar konnte nicht gespeichert werden.", {
      status: 500,
    });
  }
}
