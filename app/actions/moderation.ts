"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase-server";

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

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Nicht eingeloggt.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (!profile?.is_admin) {
    throw new Error("Keine Berechtigung.");
  }

  return { supabase, reviewerId: user.id };
}

export async function updatePostReportReview(formData: FormData) {
  const reportId =
    typeof formData.get("report_id") === "string"
      ? String(formData.get("report_id")).trim()
      : "";
  const status = formData.get("status");
  const adminNote =
    typeof formData.get("admin_note") === "string"
      ? String(formData.get("admin_note")).trim()
      : "";

  if (!reportId) {
    throw new Error("Ungültige Report-ID.");
  }

  if (!isReportStatus(status)) {
    throw new Error("Ungültiger Status.");
  }

  const { supabase, reviewerId } = await requireAdmin();
  // `post_reports` is queried via the live database schema before generated types are extended.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reportClient = supabase as any;

  const { error } = await reportClient
    .from("post_reports")
    .update({
      status,
      admin_note: adminNote.length > 0 ? adminNote : null,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", reportId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin");
}
