import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import type { ReactionType } from "@/types/feed";

// =====================================================
// Types
// =====================================================

type RouteContext = {
  params: Promise<{ id: string }>;
};

const ALLOWED_REACTIONS: ReactionType[] = ["like", "funny", "wow", "fire"];

// =====================================================
// Helpers
// =====================================================

function isReactionType(value: unknown): value is ReactionType {
  return (
    typeof value === "string" &&
    ALLOWED_REACTIONS.includes(value as ReactionType)
  );
}

// =====================================================
// POST
// =====================================================

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const commentId = Number(id);

    if (!Number.isFinite(commentId)) {
      return new NextResponse("Ungültige Kommentar-ID.", { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const reaction = body?.reaction as ReactionType | null;

    if (reaction !== null && !isReactionType(reaction)) {
      return new NextResponse("Ungültige Reaction.", { status: 400 });
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

    const { data: existingReaction, error: existingReactionError } = await supabase
      .from("comment_reactions")
      .select("id, reaction")
      .eq("comment_id", commentId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingReactionError) {
      return new NextResponse(existingReactionError.message, { status: 500 });
    }

    if (reaction === null) {
      if (!existingReaction) {
        return NextResponse.json({
          success: true,
          reaction: null,
        });
      }

      const { error: deleteError } = await supabase
        .from("comment_reactions")
        .delete()
        .eq("id", existingReaction.id);

      if (deleteError) {
        return new NextResponse(deleteError.message, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        reaction: null,
      });
    }

    if (existingReaction) {
      const { error: updateError } = await supabase
        .from("comment_reactions")
        .update({ reaction })
        .eq("id", existingReaction.id);

      if (updateError) {
        return new NextResponse(updateError.message, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        reaction,
      });
    }

    const { error: insertError } = await supabase
      .from("comment_reactions")
      .insert({
        comment_id: commentId,
        user_id: user.id,
        reaction,
      });

    if (insertError) {
      return new NextResponse(insertError.message, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      reaction,
    });
  } catch (error) {
    console.error(error);
    return new NextResponse("Kommentar-Reaction konnte nicht gespeichert werden.", {
      status: 500,
    });
  }
}