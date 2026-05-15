import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { FeedPost, ReactionCounts } from "@/shared/types/feed";
import {
  checkRateLimit,
  getActorRateLimitKey,
  RATE_LIMIT_MESSAGE,
} from "@/lib/rate-limit";

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

    const rateLimit = checkRateLimit({
      key: await getActorRateLimitKey("create-post", user.id),
      limit: 5,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return new NextResponse(RATE_LIMIT_MESSAGE, { status: 429 });
    }

    const body = await request.json().catch(() => null);
    const content = String(body?.content ?? "").trim();

    if (content.length < 2) {
      return new NextResponse("Write something before posting.", {
        status: 400,
      });
    }

    if (content.length > 500) {
      return new NextResponse(
        "Your post is too long. Keep it under 500 characters.",
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
      console.error(insertError);
      return new NextResponse("Could not create your post. Try again.", { status: 500 });
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error(profileError);
      return new NextResponse("Could not create your post. Try again.", { status: 500 });
    }

    const response: FeedPost = {
      id: insertedPost.id,
      content: insertedPost.content ?? "",
      moderation_status: "clean",
      moderation_reason: null,
      moderation_report_count: 0,
      moderation_ai_checked_at: null,
      created_at: insertedPost.created_at,
      reactions_count: 0,
      boost_count: 0,
      viewer_has_boosted: false,
      viewer_boost_available_today: true,
      is_today_post: true,
      can_boost: true,
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
    return new NextResponse("Could not create your post. Try again.", {
      status: 500,
    });
  }
}


