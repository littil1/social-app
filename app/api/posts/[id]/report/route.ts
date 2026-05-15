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

function isMissingPostReportsTableError(message: string) {
  return message.includes("Could not find the table 'public.post_reports'");
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const postId = Number(id);

    if (!Number.isFinite(postId)) {
      return new NextResponse("Invalid post ID.", { status: 400 });
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

    const { data: post, error: postError } = await supabase
      .from("posts")
      .select("id, user_id, content")
      .eq("id", postId)
      .maybeSingle();

    if (postError) {
      return new NextResponse("Could not submit the report. Try again.", {
        status: 500,
      });
    }

    if (!post) {
      return new NextResponse("Post not found.", { status: 404 });
    }

    if (post.user_id === user.id) {
      return new NextResponse("You cannot report your own posts.", {
        status: 400,
      });
    }

    const { error: insertError } = await supabase.from("post_reports").insert({
      post_id: postId,
      reporter_user_id: user.id,
      post_owner_user_id: post.user_id,
      reason,
      details: details.length > 0 ? details : null,
      status: "open",
    });

    if (insertError) {
      if (insertError.code === "23505") {
        return new NextResponse("You already reported this post.", {
          status: 409,
        });
      }

      if (isMissingPostReportsTableError(insertError.message)) {
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
      type: "post",
      id: postId,
      text: post.content ?? "",
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
          .from("posts")
          .update(updatePayload)
          .eq("id", postId);

        if (moderationUpdateError) {
          console.error(moderationUpdateError);
        }
      } catch (error) {
        console.error("Could not store post moderation AI result.", error);
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

