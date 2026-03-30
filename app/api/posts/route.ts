import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import type { FeedPost, ReactionCounts } from "@/types/feed";

// =====================================================
// Helpers
// =====================================================

function createEmptyReactionCounts(): ReactionCounts {
  return {
    like: 0,
    funny: 0,
    wow: 0,
    fire: 0,
  };
}

// =====================================================
// POST
// =====================================================

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

    const { data: insertedPost, error: insertError } = await supabase
      .from("posts")
      .insert({
        user_id: user.id,
        content,
        likes_count: 0,
        comments_count: 0,
      })
      .select("id, content, created_at, comments_count")
      .single();

    if (insertError || !insertedPost) {
      return new NextResponse(
        insertError?.message ?? "Post konnte nicht erstellt werden.",
        { status: 500 }
      );
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return new NextResponse(profileError.message, { status: 500 });
    }

    const response: FeedPost = {
      id: insertedPost.id,
      content: insertedPost.content ?? "",
      created_at: insertedPost.created_at,
      reactions_count: 0,
      reaction_counts: createEmptyReactionCounts(),
      viewer_reaction: null,
      comments_count: insertedPost.comments_count ?? 0,
      can_delete: true,
      author_username: profileData?.username ?? null,
      author_avatar_url: profileData?.avatar_url ?? null,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(error);
    return new NextResponse("Post konnte nicht erstellt werden.", {
      status: 500,
    });
  }
}