import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
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

    if (profileError || !profile?.is_admin) {
      return new NextResponse("Forbidden.", { status: 403 });
    }

    const adminSupabase = createAdminClient();
    const [
      { data: openPostReports },
      { data: openCommentReports },
      { data: reportedPosts },
      { data: reportedComments },
    ] = await Promise.all([
      adminSupabase
        .from("post_reports")
        .select("post_id")
        .in("status", ["open", "reviewing"]),
      adminSupabase
        .from("comment_reports")
        .select("comment_id")
        .in("status", ["open", "reviewing"]),
      adminSupabase
        .from("posts")
        .select("id")
        .eq("moderation_status", "reported"),
      adminSupabase
        .from("comments")
        .select("id")
        .eq("moderation_status", "reported"),
    ]);

    const openPostIds = new Set<number>();
    for (const report of openPostReports ?? []) {
      openPostIds.add(report.post_id);
    }
    for (const post of reportedPosts ?? []) {
      openPostIds.add(post.id);
    }

    const openCommentIds = new Set<number>();
    for (const report of openCommentReports ?? []) {
      openCommentIds.add(report.comment_id);
    }
    for (const comment of reportedComments ?? []) {
      openCommentIds.add(comment.id);
    }

    return NextResponse.json({
      count: openPostIds.size + openCommentIds.size,
    });
  } catch (error) {
    console.error(error);
    return new NextResponse("Moderation count could not be loaded.", {
      status: 500,
    });
  }
}
