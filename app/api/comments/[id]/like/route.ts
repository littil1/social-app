import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_: NextRequest, context: RouteContext) {
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

    const { data: comment, error: commentError } = await supabase
      .from("comments")
      .select("id")
      .eq("id", commentId)
      .maybeSingle();

    if (commentError) {
      return new NextResponse(commentError.message, { status: 500 });
    }

    if (!comment) {
      return new NextResponse("Kommentar nicht gefunden.", { status: 404 });
    }

    const { data: existingLike, error: existingLikeError } = await supabase
      .from("comment_likes")
      .select("id")
      .eq("comment_id", commentId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingLikeError) {
      return new NextResponse(existingLikeError.message, { status: 500 });
    }

    if (existingLike) {
      const { error: deleteError } = await supabase
        .from("comment_likes")
        .delete()
        .eq("comment_id", commentId)
        .eq("user_id", user.id);

      if (deleteError) {
        return new NextResponse(deleteError.message, { status: 500 });
      }

      return NextResponse.json({ liked: false });
    }

    const { error: insertError } = await supabase.from("comment_likes").insert({
      comment_id: commentId,
      user_id: user.id,
    });

    if (insertError) {
      return new NextResponse(insertError.message, { status: 500 });
    }

    return NextResponse.json({ liked: true });
  } catch (error) {
    console.error(error);
    return new NextResponse("Kommentar-Like konnte nicht gespeichert werden.", {
      status: 500,
    });
  }
}