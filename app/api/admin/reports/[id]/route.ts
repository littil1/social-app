import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const ALLOWED_REPORT_STATUSES = [
  "open",
  "reviewing",
  "resolved",
  "dismissed",
] as const;

type ReportStatus = (typeof ALLOWED_REPORT_STATUSES)[number];

function isReportStatus(value: unknown): value is ReportStatus {
  return (
    typeof value === "string" &&
    ALLOWED_REPORT_STATUSES.includes(value as ReportStatus)
  );
}

function isMissingPostReportsTableError(message: string) {
  return message.includes("Could not find the table 'public.post_reports'");
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const reportId = id?.trim();

    if (!reportId) {
      return new NextResponse("Invalid report ID.", { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse("Not signed in.", { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return new NextResponse(profileError.message, { status: 500 });
    }

    if (!profile?.is_admin) {
      return new NextResponse("Forbidden.", { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const status = body?.status;
    const adminNote =
      typeof body?.admin_note === "string" ? body.admin_note.trim() : "";

    if (!isReportStatus(status)) {
      return new NextResponse("Invalid status.", { status: 400 });
    }

    const { data, error } = await supabase
      .from("post_reports")
      .update({
        status,
        admin_note: adminNote.length > 0 ? adminNote : null,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", reportId)
      .select("*")
      .single();

    if (error) {
      if (isMissingPostReportsTableError(error.message)) {
        return new NextResponse(
          "The reports table is not available yet. Run the migration first.",
          { status: 503 }
        );
      }

      return new NextResponse(error.message, { status: 500 });
    }

    if (!data) {
      return new NextResponse("Report not found.", { status: 404 });
    }

    return NextResponse.json({
      report: {
        id: data.id,
        target_type: "post",
        target_id: data.post_id,
        post_id: data.post_id,
        reporter_user_id: data.reporter_user_id,
        owner_user_id: data.post_owner_user_id,
        reason: data.reason,
        details: data.details,
        status: data.status,
        admin_note: data.admin_note,
        reviewed_by: data.reviewed_by,
        reviewed_at: data.reviewed_at,
        created_at: data.created_at,
        updated_at: data.updated_at,
      },
    });
  } catch (error) {
    console.error(error);
    return new NextResponse("Report could not be updated.", {
      status: 500,
    });
  }
}

