import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { recomputeUserBadgeFamilies } from "@/features/badges/lib";
import {
  checkRateLimit,
  getActorRateLimitKey,
  RATE_LIMIT_MESSAGE,
} from "@/lib/rate-limit";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const ALLOWED_REACTIONS = ["like", "funny", "wow", "fire"] as const;
type ReactionType = (typeof ALLOWED_REACTIONS)[number];

function isReactionType(value: unknown): value is ReactionType {
  return (
    typeof value === "string" &&
    ALLOWED_REACTIONS.includes(value as ReactionType)
  );
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const postId = Number(id);

    if (!Number.isFinite(postId)) {
      return new NextResponse("Invalid post ID.", { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const reaction = body?.reaction as ReactionType | null;

    if (reaction !== null && !isReactionType(reaction)) {
      return new NextResponse("Invalid reaction.", { status: 400 });
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse("Not signed in.", { status: 401 });
    }

    const rateLimit = checkRateLimit({
      key: await getActorRateLimitKey("reaction", user.id),
      limit: 100,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return new NextResponse(RATE_LIMIT_MESSAGE, { status: 429 });
    }

    const { data: post, error: postError } = await supabase
      .from("posts")
      .select("id, user_id")
      .eq("id", postId)
      .maybeSingle();

    if (postError) {
      return new NextResponse("Reaction could not be saved.", { status: 500 });
    }

    if (!post) {
      return new NextResponse("Post not found.", { status: 404 });
    }

    const { data: existingReaction, error: existingReactionError } =
      await supabase
        .from("post_reactions")
        .select("id, reaction")
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .maybeSingle();

    if (existingReactionError) {
      return new NextResponse("Reaction could not be saved.", { status: 500 });
    }

    let authorUsername: string | null = null;

    if (post.user_id) {
      const { data: authorProfile, error: authorProfileError } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", post.user_id)
        .maybeSingle();

      if (authorProfileError) {
        return new NextResponse("Reaction could not be saved.", { status: 500 });
      }

      authorUsername = authorProfile?.username ?? null;
    }

    const recomputeBadges = async () => {
      await recomputeUserBadgeFamilies(supabase, user.id, [
        "top_reactor",
      ]);

      if (post.user_id) {
        await recomputeUserBadgeFamilies(supabase, post.user_id, [
          "most_reacted",
        ]);
      }
    };

    if (reaction === null) {
      if (!existingReaction) {
        return NextResponse.json({
          success: true,
          reaction: null,
        });
      }

      const { error: deleteError } = await supabase
        .from("post_reactions")
        .delete()
        .eq("id", existingReaction.id);

      if (deleteError) {
        return new NextResponse("Reaction could not be saved.", { status: 500 });
      }

      await recomputeBadges();

      revalidatePath("/");
      if (authorUsername) {
        revalidatePath(`/u/${authorUsername}`);
      }

      return NextResponse.json({
        success: true,
        reaction: null,
      });
    }

    if (existingReaction) {
      const { error: updateError } = await supabase
        .from("post_reactions")
        .update({ reaction })
        .eq("id", existingReaction.id);

      if (updateError) {
        return new NextResponse("Reaction could not be saved.", { status: 500 });
      }

      await recomputeBadges();

      revalidatePath("/");
      if (authorUsername) {
        revalidatePath(`/u/${authorUsername}`);
      }

      return NextResponse.json({
        success: true,
        reaction,
      });
    }

    const { error: insertError } = await supabase.from("post_reactions").insert({
      post_id: postId,
      user_id: user.id,
      reaction,
    });

    if (insertError) {
      return new NextResponse("Reaction could not be saved.", { status: 500 });
    }

    await recomputeBadges();

    revalidatePath("/");
    if (authorUsername) {
      revalidatePath(`/u/${authorUsername}`);
    }

    return NextResponse.json({
      success: true,
      reaction,
    });
  } catch (error) {
    console.error(error);
    return new NextResponse("Reaction could not be saved.", {
      status: 500,
    });
  }
}

