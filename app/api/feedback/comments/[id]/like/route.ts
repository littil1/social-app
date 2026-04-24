import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recomputeUserBadgeFamilies } from "@/features/badges/lib";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const ALLOWED_REACTIONS = ["like", "funny", "wow", "fire"] as const;
type ReactionType = (typeof ALLOWED_REACTIONS)[number];

function isReactionType(value: unknown): value is ReactionType {
  return (
    typeof value === "string" &&
    ALLOWED_REACTIONS.includes(value as ReactionType)
  );
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await context.params;
    const commentId = Number(id);

    if (!Number.isFinite(commentId)) {
      return new NextResponse("Invalid comment ID.", { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const reaction = body?.reaction;

    if (!isReactionType(reaction)) {
      return new NextResponse("Invalid reaction.", { status: 400 });
    }

    const { data: comment, error: commentError } = await supabase
      .from("feature_request_comments")
      .select("id, user_id")
      .eq("id", commentId)
      .maybeSingle();

    if (commentError) {
      return new NextResponse(commentError.message, { status: 500 });
    }

    if (!comment) {
      return new NextResponse("Comment not found.", { status: 404 });
    }

    const { data: existingReaction, error: existingReactionError } = await supabase
      .from("feature_request_comment_reactions")
      .select("id, reaction")
      .eq("comment_id", commentId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingReactionError) {
      return new NextResponse(existingReactionError.message, { status: 500 });
    }

    if (existingReaction) {
      if (existingReaction.reaction === reaction) {
        const { error: deleteError } = await supabase
          .from("feature_request_comment_reactions")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", user.id);

        if (deleteError) {
          return new NextResponse(deleteError.message, { status: 500 });
        }

        await recomputeUserBadgeFamilies(supabase as any, user.id, [
          "top_reactor",
        ]);

        if (comment.user_id) {
          await recomputeUserBadgeFamilies(supabase as any, comment.user_id, [
            "most_reacted",
          ]);
        }

        return NextResponse.json({ success: true, viewer_reaction: null });
      }

      const { error: updateError } = await supabase
        .from("feature_request_comment_reactions")
        .update({ reaction })
        .eq("comment_id", commentId)
        .eq("user_id", user.id);

      if (updateError) {
        return new NextResponse(updateError.message, { status: 500 });
      }

      await recomputeUserBadgeFamilies(supabase as any, user.id, [
        "top_reactor",
      ]);

      if (comment.user_id) {
        await recomputeUserBadgeFamilies(supabase as any, comment.user_id, [
          "most_reacted",
        ]);
      }

      return NextResponse.json({ success: true, viewer_reaction: reaction });
    }

    const { error: insertError } = await supabase
      .from("feature_request_comment_reactions")
      .insert([
        {
          comment_id: commentId,
          user_id: user.id,
          reaction,
        },
      ]);

    if (insertError) {
      return new NextResponse(insertError.message, { status: 500 });
    }

    await recomputeUserBadgeFamilies(supabase as any, user.id, [
      "top_reactor",
    ]);

    if (comment.user_id) {
      await recomputeUserBadgeFamilies(supabase as any, comment.user_id, [
        "most_reacted",
      ]);
    }

    return NextResponse.json({ success: true, viewer_reaction: reaction });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error.";
    return new NextResponse(message, { status: 500 });
  }
}


