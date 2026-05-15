import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type ModerationStatus = "clean" | "blurred" | "removed";
type ModerationTargetType = "post" | "comment";

const ALLOWED_STATUSES = ["clean", "blurred", "removed"] as const;

function isModerationStatus(value: unknown): value is ModerationStatus {
  return (
    typeof value === "string" &&
    ALLOWED_STATUSES.includes(value as ModerationStatus)
  );
}

function isTargetType(value: unknown): value is ModerationTargetType {
  return value === "post" || value === "comment";
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: new NextResponse("Not signed in.", { status: 401 }) };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return { error: new NextResponse("Moderation action failed.", { status: 500 }) };
  }

  if (!profile?.is_admin) {
    return { error: new NextResponse("Forbidden.", { status: 403 }) };
  }

  return { userId: user.id };
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin();

    if (admin.error) {
      return admin.error;
    }

    const body = await request.json().catch(() => null);
    const targetType = body?.target_type;
    const targetId = Number(body?.target_id);
    const status = body?.moderation_status;
    const reason =
      typeof body?.moderation_reason === "string"
        ? body.moderation_reason.trim()
        : "";

    if (!isTargetType(targetType) || !Number.isFinite(targetId)) {
      return new NextResponse("Invalid moderation target.", { status: 400 });
    }

    if (!isModerationStatus(status)) {
      return new NextResponse("Invalid moderation status.", { status: 400 });
    }

    const adminSupabase = createAdminClient();
    const reviewedAt = new Date().toISOString();
    const table = targetType === "post" ? "posts" : "comments";

    const updatePayload: Record<string, unknown> = {
      moderation_status: status,
      moderation_reason: reason.length > 0 ? reason : null,
      moderation_reviewed_by: admin.userId,
      moderation_reviewed_at: reviewedAt,
    };

    if (targetType === "comment" && status === "removed") {
      updatePayload.deleted_at = reviewedAt;
      updatePayload.content = "";
    }

    const { error: contentError } = await adminSupabase
      .from(table)
      .update(updatePayload)
      .eq("id", targetId);

    if (contentError) {
      console.error(contentError);
      return new NextResponse("Moderation action failed.", { status: 500 });
    }

    const reportStatus = status === "clean" ? "dismissed" : "resolved";
    const reportsTable =
      targetType === "post" ? "post_reports" : "comment_reports";
    const reportIdColumn = targetType === "post" ? "post_id" : "comment_id";

    const { error: reportsError } = await adminSupabase
      .from(reportsTable)
      .update({
        status: reportStatus,
        admin_note: reason.length > 0 ? reason : null,
        reviewed_by: admin.userId,
        reviewed_at: reviewedAt,
      })
      .eq(reportIdColumn, targetId)
      .in("status", ["open", "reviewing"]);

    if (reportsError) {
      console.error(reportsError);
    }

    return NextResponse.json({
      success: true,
      target_type: targetType,
      target_id: targetId,
      moderation_status: status,
      moderation_reason: reason.length > 0 ? reason : null,
      moderation_reviewed_by: admin.userId,
      moderation_reviewed_at: reviewedAt,
    });
  } catch (error) {
    console.error(error);
    return new NextResponse("Moderation action failed.", { status: 500 });
  }
}
