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
    const [{ count: postCount }, { count: commentCount }] = await Promise.all([
      adminSupabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .in("moderation_status", ["reported", "blurred"]),
      adminSupabase
        .from("comments")
        .select("id", { count: "exact", head: true })
        .in("moderation_status", ["reported", "blurred"]),
    ]);

    return NextResponse.json({
      count: (postCount ?? 0) + (commentCount ?? 0),
    });
  } catch (error) {
    console.error(error);
    return new NextResponse("Moderation count could not be loaded.", {
      status: 500,
    });
  }
}
