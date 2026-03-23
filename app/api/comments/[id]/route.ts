import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import type { Database } from "@/types/database";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type CommentRow = Database["public"]["Tables"]["comments"]["Row"];
type PostRow = Database["public"]["Tables"]["posts"]["Row"];

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

    let viewerIsAdmin = false;

    const { data: viewerProfile, error: viewerProfileError } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (viewerProfileError) {
      return new NextResponse(viewerProfileError.message, { status: 500 });
    }

    viewerIsAdmin = viewerProfile?.is_admin ?? false;

    const { data: commentData, error: commentError } = await supabase
      .from("comments")
      .select("*")
      .eq("id", commentId)
      .maybeSingle();

    if (commentError) {
      return new NextResponse(commentError.message, { status: 500 });
    }

    if (!commentData) {
      return new NextResponse("Kommentar nicht gefunden.", { status: 404 });
    }

    const comment = commentData as CommentRow;

    if (!viewerIsAdmin && comment.user_id !== user.id) {
      return new NextResponse("Keine Berechtigung.", { status: 403 });
    }

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
          comments_count: Math.max(0, currentCount - 1),
        })
        .eq("id", post.id);

      if (updateError) {
        return new NextResponse(updateError.message, { status: 500 });
      }
    }

    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error(error);
    return new NextResponse("Kommentar konnte nicht gelöscht werden.", {
      status: 500,
    });
  }
}