import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  checkRateLimit,
  getActorRateLimitKey,
  RATE_LIMIT_MESSAGE,
} from "@/lib/rate-limit";
import { analyzeReportedContent } from "@/features/moderation/lib/server";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const ALLOWED_REPORT_REASONS = [
  "spam",
  "harassment",
  "hate",
  "sexual",
  "violence",
  "misleading",
  "other",
] as const;

type ReportReason = (typeof ALLOWED_REPORT_REASONS)[number];

function isReportReason(value: unknown): value is ReportReason {
  return (
    typeof value === "string" &&
    ALLOWED_REPORT_REASONS.includes(value as ReportReason)
  );
}

function isMissingCommentReportsTableError(message: string) {
  return message.includes("Could not find the table 'public.comment_reports'");
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const commentId = Number(id);

    if (!Number.isFinite(commentId)) {
      return new NextResponse("Invalid comment ID.", { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse("Not signed in.", { status: 401 });
    }

    const rateLimit = checkRateLimit({
      key: await getActorRateLimitKey("report", user.id),
      limit: 10,
      windowMs: 60 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return new NextResponse(RATE_LIMIT_MESSAGE, { status: 429 });
    }

    const body = await request.json().catch(() => null);
    const reason = body?.reason;
    const details =
      typeof body?.details === "string" ? body.details.trim() : "";

    if (!isReportReason(reason)) {
      return new NextResponse("Choose a reason before submitting.", { status: 400 });
    }

    if (details.length > 1000) {
      return new NextResponse("Details are too long.", { status: 400 });
    }

    const { data: comment, error: commentError } = await supabase
      .from("comments")
      .select("id, user_id, content")
      .eq("id", commentId)
      .maybeSingle();

    if (commentError) {
      return new NextResponse("Could not submit the report. Try again.", {
        status: 500,
      });
    }

    if (!comment) {
      return new NextResponse("Comment not found.", { status: 404 });
    }

    if (comment.user_id === user.id) {
      return new NextResponse(
        "You cannot report your own comments.",
        { status: 400 }
      );
    }

    const { error: insertError } = await supabase
      .from("comment_reports")
      .insert({
        comment_id: commentId,
        reporter_user_id: user.id,
        comment_owner_user_id: comment.user_id,
        reason,
        details: details.length > 0 ? details : null,
        status: "open",
      });

    if (insertError) {
      if (insertError.code === "23505") {
        return new NextResponse("You already reported this comment.", {
          status: 409,
        });
      }

      if (isMissingCommentReportsTableError(insertError.message)) {
        return new NextResponse(
          "Reporting is not available yet. Please try again shortly.",
          { status: 503 }
        );
      }

      console.error(insertError);
      return new NextResponse("Could not submit the report. Try again.", {
        status: 500,
      });
    }

    const moderationResult = await analyzeReportedContent({
      type: "comment",
      id: commentId,
      text: comment.content ?? "",
    });

    if (moderationResult) {
      try {
        const adminSupabase = createAdminClient();
        const updatePayload: Record<string, unknown> = {
          moderation_ai_summary: moderationResult.summary,
          moderation_ai_categories: {
            flagged: moderationResult.flagged,
            categories: moderationResult.categories,
          },
          moderation_ai_scores: moderationResult.scores,
          moderation_ai_checked_at: moderationResult.checkedAt,
        };

        if (moderationResult.emergencyStatus) {
          updatePayload.moderation_status = moderationResult.emergencyStatus;
          updatePayload.moderation_reason =
            "AI emergency brake: high-confidence reported content risk.";
        }

        const { error: moderationUpdateError } = await adminSupabase
          .from("comments")
          .update(updatePayload)
          .eq("id", commentId);

        if (moderationUpdateError) {
          console.error(moderationUpdateError);
        }
      } catch (error) {
        console.error("Could not store comment moderation AI result.", error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return new NextResponse("Could not submit the report. Try again.", {
      status: 500,
    });
  }
}

