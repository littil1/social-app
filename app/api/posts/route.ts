import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { FeedPost, ReactionCounts } from "@/shared/types/feed";

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
      return new NextResponse("Not signed in.", { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const content = String(body?.content ?? "").trim();

    if (content.length < 2) {
      return new NextResponse("Post content must be at least 2 characters.", {
        status: 400,
      });
    }

    if (content.length > 500) {
      return new NextResponse(
        "Post content must be 500 characters or fewer.",
        { status: 400 }
      );
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
        insertError?.message ?? "Post could not be created.",
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
    return new NextResponse("Post could not be created.", {
      status: 500,
    });
  }
}


