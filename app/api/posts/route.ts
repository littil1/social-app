import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import type { FeedPost } from "@/types/feed";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse("Nicht eingeloggt.", { status: 401 });
    }

    const body = await request.json();
    const content = String(body?.content ?? "").trim();

    if (!content) {
      return new NextResponse("Post-Inhalt fehlt.", { status: 400 });
    }

    const { data, error } = await supabase
      .from("posts")
      .insert({
        user_id: user.id,
        content,
        likes_count: 0,
        comments_count: 0,
      })
      .select("id, content, created_at, likes_count, comments_count")
      .single();

    if (error || !data) {
      return new NextResponse(
        error?.message ?? "Post konnte nicht erstellt werden.",
        { status: 500 }
      );
    }

    const response: FeedPost = {
      id: data.id,
      content: data.content ?? "",
      created_at: data.created_at,
      likes_count: data.likes_count ?? 0,
      comments_count: data.comments_count ?? 0,
      viewer_has_liked: false,
      can_delete: true,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(error);
    return new NextResponse("Post konnte nicht erstellt werden.", {
      status: 500,
    });
  }
}