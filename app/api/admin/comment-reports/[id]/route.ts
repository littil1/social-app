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

function isMissingCommentReportsTableError(message: string) {
  return message.includes("Could not find the table 'public.comment_reports'");
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const reportId = id?.trim();

    if (!reportId) {
      return new NextResponse("Ungültige Report-ID.", { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse("Nicht eingeloggt.", { status: 401 });
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
      return new NextResponse("Keine Berechtigung.", { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const status = body?.status;
    const adminNote =
      typeof body?.admin_note === "string" ? body.admin_note.trim() : "";

    if (!isReportStatus(status)) {
      return new NextResponse("Ungültiger Status.", { status: 400 });
    }

    const { data, error } = await supabase
      .from("comment_reports")
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
      if (isMissingCommentReportsTableError(error.message)) {
        return new NextResponse(
          "Die Kommentar-Reports-Tabelle ist noch nicht verfuegbar. Fuehre zuerst die Migration aus.",
          { status: 503 }
        );
      }

      return new NextResponse(error.message, { status: 500 });
    }

    if (!data) {
      return new NextResponse("Report nicht gefunden.", { status: 404 });
    }

    return NextResponse.json({
      report: {
        id: data.id,
        target_type: "comment",
        target_id: data.comment_id,
        post_id: null,
        reporter_user_id: data.reporter_user_id,
        owner_user_id: data.comment_owner_user_id,
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
    return new NextResponse("Kommentar-Report konnte nicht aktualisiert werden.", {
      status: 500,
    });
  }
}

