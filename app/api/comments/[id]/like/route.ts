import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ReactionType } from "@/shared/types/feed";
import { safeRecomputeUserBadgeFamiliesWithAdmin } from "@/features/badges/lib/server";
import {
  checkRateLimit,
  getActorRateLimitKey,
  RATE_LIMIT_MESSAGE,
} from "@/lib/rate-limit";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const ALLOWED_REACTIONS: ReactionType[] = ["like", "funny", "wow", "fire"];

function isReactionType(value: unknown): value is ReactionType {
  return (
    typeof value === "string" &&
    ALLOWED_REACTIONS.includes(value as ReactionType)
  );
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const commentId = Number(id);

    if (!Number.isFinite(commentId)) {
      return new NextResponse("Invalid comment id.", { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const reaction = body?.reaction as ReactionType | null;

    if (reaction !== null && !isReactionType(reaction)) {
      return new NextResponse("Invalid reaction.", { status: 400 });
    }

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

    const { data: comment, error: commentError } = await supabase
      .from("comments")
      .select("id, user_id, deleted_at")
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

    if (comment.deleted_at) {
      return new NextResponse("Deleted comments cannot be reacted to.", {
        status: 409,
      });
    }

    const { data: existingReaction, error: existingReactionError } =
      await supabase
        .from("comment_reactions")
        .select("id, reaction")
        .eq("comment_id", commentId)
        .eq("user_id", user.id)
        .maybeSingle();

    if (existingReactionError) {
      return new NextResponse("Comment reaction could not be saved.", {
        status: 500,
      });
    }

    const recomputeBadges = async () => {
      await safeRecomputeUserBadgeFamiliesWithAdmin(user.id, [
        "top_reactor",
      ], "comment-reaction:reactor");

      if (comment.user_id) {
        await safeRecomputeUserBadgeFamiliesWithAdmin(comment.user_id, [
          "most_reacted",
        ], "comment-reaction:author");
      }
    };

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
        return new NextResponse("Comment reaction could not be saved.", {
          status: 500,
        });
      }

      await recomputeBadges();

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
        return new NextResponse("Comment reaction could not be saved.", {
          status: 500,
        });
      }

      await recomputeBadges();

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
      return new NextResponse("Comment reaction could not be saved.", {
        status: 500,
      });
    }

    await recomputeBadges();

    return NextResponse.json({
      success: true,
      reaction,
    });
  } catch (error) {
    console.error(error);
    return new NextResponse("Comment reaction could not be saved.", {
      status: 500,
    });
  }
}


