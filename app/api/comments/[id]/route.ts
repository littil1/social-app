import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/shared/types/database";
import { recomputeUserBadgeFamilies } from "@/features/badges/lib";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type CommentRow = Database["public"]["Tables"]["comments"]["Row"];
type CommentTreeRow = Pick<
  CommentRow,
  "id" | "post_id" | "user_id" | "parent_id" | "deleted_at"
>;

export async function DELETE(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const commentId = Number(id);

    if (!Number.isFinite(commentId)) {
      return new NextResponse("Invalid comment id.", { status: 400 });
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse("Not signed in.", { status: 401 });
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
      .select("id, post_id, user_id, parent_id, deleted_at")
      .eq("id", commentId)
      .maybeSingle();

    if (commentError) {
      return new NextResponse(commentError.message, { status: 500 });
    }

    if (!commentData) {
      return NextResponse.json({ success: true });
    }

    const comment = commentData as CommentTreeRow;

    if (!viewerIsAdmin && comment.user_id !== user.id) {
      return new NextResponse("Forbidden.", { status: 403 });
    }

    if (comment.deleted_at) {
      return NextResponse.json({ success: true });
    }

    const { data: postAuthorData, error: postAuthorError } = await supabase
      .from("posts")
      .select("user_id")
      .eq("id", comment.post_id)
      .maybeSingle();

    if (postAuthorError) {
      return new NextResponse(postAuthorError.message, { status: 500 });
    }

    const postAuthorId = postAuthorData?.user_id ?? null;
    const deletedAt = new Date().toISOString();

    const { data: updatedCommentData, error: updateError } = await supabase
      .from("comments")
      .update({
        deleted_at: deletedAt,
        content: "",
      })
      .eq("id", commentId)
      .select("id, deleted_at, content")
      .maybeSingle();

    if (updateError) {
      console.log("UPDATE ERROR:", updateError);
      return new NextResponse("Comment could not be deleted.", {
        status: 500,
      });
    }

    if (comment.user_id) {
      await recomputeUserBadgeFamilies(supabase, comment.user_id, [
        "top_commentator",
      ]);
    }

    if (postAuthorId) {
      await recomputeUserBadgeFamilies(supabase, postAuthorId, [
        "most_discussed",
      ]);
    }

    return NextResponse.json({
      success: true,
      id: comment.id,
      deletedAt,
    });
  } catch (error) {
    console.error(error);
    return new NextResponse("Comment could not be deleted.", {
      status: 500,
    });
  }
}

