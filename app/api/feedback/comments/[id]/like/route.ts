import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeRecomputeUserBadgeFamiliesWithAdmin } from "@/features/badges/lib/server";
import {
  checkRateLimit,
  getActorRateLimitKey,
  RATE_LIMIT_MESSAGE,
} from "@/lib/rate-limit";

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
      return new NextResponse("Not signed in.", { status: 401 });
    }

    const rateLimit = checkRateLimit({
      key: await getActorRateLimitKey("reaction", user.id),
      limit: 100,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return new NextResponse(RATE_LIMIT_MESSAGE, { status: 429 });
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
      return new NextResponse("Comment reaction could not be saved.", {
        status: 500,
      });
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
      return new NextResponse("Comment reaction could not be saved.", {
        status: 500,
      });
    }

    if (existingReaction) {
      if (existingReaction.reaction === reaction) {
        const { error: deleteError } = await supabase
          .from("feature_request_comment_reactions")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", user.id);

        if (deleteError) {
          return new NextResponse("Comment reaction could not be saved.", {
            status: 500,
          });
        }

        await safeRecomputeUserBadgeFamiliesWithAdmin(user.id, [
          "top_reactor",
        ], "feedback-comment-reaction:reactor");

        if (comment.user_id) {
          await safeRecomputeUserBadgeFamiliesWithAdmin(comment.user_id, [
            "most_reacted",
          ], "feedback-comment-reaction:author");
        }

        return NextResponse.json({ success: true, viewer_reaction: null });
      }

      const { error: updateError } = await supabase
        .from("feature_request_comment_reactions")
        .update({ reaction })
        .eq("comment_id", commentId)
        .eq("user_id", user.id);

      if (updateError) {
        return new NextResponse("Comment reaction could not be saved.", {
          status: 500,
        });
      }

      await safeRecomputeUserBadgeFamiliesWithAdmin(user.id, [
        "top_reactor",
      ], "feedback-comment-reaction:reactor");

      if (comment.user_id) {
        await safeRecomputeUserBadgeFamiliesWithAdmin(comment.user_id, [
          "most_reacted",
        ], "feedback-comment-reaction:author");
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
      return new NextResponse("Comment reaction could not be saved.", {
        status: 500,
      });
    }

    await safeRecomputeUserBadgeFamiliesWithAdmin(user.id, [
      "top_reactor",
    ], "feedback-comment-reaction:reactor");

    if (comment.user_id) {
      await safeRecomputeUserBadgeFamiliesWithAdmin(comment.user_id, [
        "most_reacted",
      ], "feedback-comment-reaction:author");
    }

    return NextResponse.json({ success: true, viewer_reaction: reaction });
  } catch (error) {
    console.error(error);
    return new NextResponse("Comment reaction could not be saved.", {
      status: 500,
    });
  }
}


