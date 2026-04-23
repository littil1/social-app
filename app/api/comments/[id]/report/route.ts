import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
      return new NextResponse("Ungültige Kommentar-ID.", { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse("Nicht eingeloggt.", { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const reason = body?.reason;
    const details =
      typeof body?.details === "string" ? body.details.trim() : "";

    if (!isReportReason(reason)) {
      return new NextResponse("Ungültiger Report-Grund.", { status: 400 });
    }

    if (details.length > 1000) {
      return new NextResponse("Details sind zu lang.", { status: 400 });
    }

    const { data: comment, error: commentError } = await supabase
      .from("comments")
      .select("id, user_id")
      .eq("id", commentId)
      .maybeSingle();

    if (commentError) {
      return new NextResponse(commentError.message, { status: 500 });
    }

    if (!comment) {
      return new NextResponse("Kommentar nicht gefunden.", { status: 404 });
    }

    if (comment.user_id === user.id) {
      return new NextResponse(
        "Eigene Kommentare können nicht gemeldet werden.",
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
        return new NextResponse("Du hast diesen Kommentar bereits gemeldet.", {
          status: 409,
        });
      }

      if (isMissingCommentReportsTableError(insertError.message)) {
        return new NextResponse(
          "Die Report-Funktion ist gerade noch nicht verfuegbar. Bitte versuche es in Kuerze erneut.",
          { status: 503 }
        );
      }

      return new NextResponse(insertError.message, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return new NextResponse("Kommentar konnte nicht gemeldet werden.", {
      status: 500,
    });
  }
}

