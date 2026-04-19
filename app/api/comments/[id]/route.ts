import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import type { Database } from "@/types/database";
import { recomputeUserBadgeFamilies } from "@/lib/badges";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type CommentRow = Database["public"]["Tables"]["comments"]["Row"];
type PostRow = Database["public"]["Tables"]["posts"]["Row"];

type CommentTreeRow = Pick<
  CommentRow,
  "id" | "post_id" | "user_id" | "parent_id"
>;

function collectCommentIdsToDelete(
  rootCommentId: number,
  comments: CommentTreeRow[]
): Set<number> {
  const idsToDelete = new Set<number>([rootCommentId]);
  let changed = true;

  while (changed) {
    changed = false;

    for (const comment of comments) {
      if (
        comment.parent_id !== null &&
        idsToDelete.has(comment.parent_id) &&
        !idsToDelete.has(comment.id)
      ) {
        idsToDelete.add(comment.id);
        changed = true;
      }
    }
  }

  return idsToDelete;
}

export async function DELETE(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const commentId = Number(id);

    if (!Number.isFinite(commentId)) {
      return new NextResponse("Ungültige Kommentar-ID.", { status: 400 });
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse("Nicht eingeloggt.", { status: 401 });
    }

    const { data: viewerProfile, error: viewerProfileError } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (viewerProfileError) {
      return new NextResponse(viewerProfileError.message, { status: 500 });
    }

    const viewerIsAdmin = viewerProfile?.is_admin ?? false;

    const { data: commentData, error: commentError } = await supabase
      .from("comments")
      .select("id, post_id, user_id, parent_id")
      .eq("id", commentId)
      .maybeSingle();

    if (commentError) {
      return new NextResponse(commentError.message, { status: 500 });
    }

    if (!commentData) {
      return new NextResponse("Kommentar nicht gefunden.", { status: 404 });
    }

    const comment = commentData as CommentTreeRow;

    if (!viewerIsAdmin && comment.user_id !== user.id) {
      return new NextResponse("Keine Berechtigung.", { status: 403 });
    }

    const { data: postAuthorData } = await supabase
      .from("posts")
      .select("user_id")
      .eq("id", comment.post_id)
      .maybeSingle();

    const postAuthorId = postAuthorData?.user_id ?? null;

    const { data: postCommentsData, error: postCommentsError } = await supabase
      .from("comments")
      .select("id, post_id, user_id, parent_id")
      .eq("post_id", comment.post_id);

    if (postCommentsError) {
      return new NextResponse(postCommentsError.message, { status: 500 });
    }

    const postComments = (postCommentsData ?? []) as CommentTreeRow[];
    const idsToDelete = collectCommentIdsToDelete(commentId, postComments);
    const deletedCount = idsToDelete.size;

    const { error: deleteError } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId);

    if (deleteError) {
      return new NextResponse(deleteError.message, { status: 500 });
    }

    const { data: postData, error: postError } = await supabase
      .from("posts")
      .select("*")
      .eq("id", comment.post_id)
      .maybeSingle();

    if (postError) {
      return new NextResponse(postError.message, { status: 500 });
    }

    if (postData) {
      const post = postData as PostRow;
      const currentCount = post.comments_count ?? 0;

      const { error: updateError } = await supabase
        .from("posts")
        .update({
          comments_count: Math.max(0, currentCount - deletedCount),
        })
        .eq("id", post.id);

      if (updateError) {
        return new NextResponse(updateError.message, { status: 500 });
      }
    }

    if (comment.user_id) {
      await recomputeUserBadgeFamilies(supabase as any, comment.user_id, [
        "top_commentator",
      ]);
    }

    if (postAuthorId) {
      await recomputeUserBadgeFamilies(supabase as any, postAuthorId, [
        "most_discussed",
      ]);
    }

    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error(error);
    return new NextResponse("Kommentar konnte nicht gelöscht werden.", {
      status: 500,
    });
  }
}