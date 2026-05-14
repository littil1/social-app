import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getZurichDayRange } from "@/features/winners/lib/daily-ranking";
import {
  checkRateLimit,
  getActorRateLimitKey,
  RATE_LIMIT_MESSAGE,
} from "@/lib/rate-limit";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function isWithinRange(value: string, startIso: string, endIso: string) {
  const time = new Date(value).getTime();
  return time >= new Date(startIso).getTime() && time < new Date(endIso).getTime();
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const postId = Number(id);

    if (!Number.isFinite(postId)) {
      return new NextResponse("Invalid post ID.", { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse("Sign in to BOOST this post.", { status: 401 });
    }

    const rateLimit = checkRateLimit({
      key: await getActorRateLimitKey("boost", user.id),
      limit: 20,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return new NextResponse(RATE_LIMIT_MESSAGE, { status: 429 });
    }

    const { dayKey, startIso, endIso } = getZurichDayRange(new Date());
    const { data: post, error: postError } = await supabase
      .from("posts")
      .select("id, created_at, user_id")
      .eq("id", postId)
      .maybeSingle();

    if (postError) {
      return new NextResponse("Couldn't BOOST this post. Try again.", {
        status: 500,
      });
    }

    if (!post) {
      return new NextResponse("Post not found.", { status: 404 });
    }

    if (!isWithinRange(post.created_at, startIso, endIso)) {
      return new NextResponse("BOOST is only available for today's posts.", {
        status: 400,
      });
    }

    const { error: insertError } = await supabase.from("post_boosts").insert({
      post_id: postId,
      user_id: user.id,
      day_key: dayKey,
    });

    if (insertError) {
      if (insertError.code === "23505") {
        return new NextResponse("You already used today's BOOST.", {
          status: 409,
        });
      }

      return new NextResponse("Couldn't BOOST this post. Try again.", {
        status: 500,
      });
    }

    const { count, error: countError } = await supabase
      .from("post_boosts")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId);

    if (countError) {
      return new NextResponse("Couldn't BOOST this post. Try again.", {
        status: 500,
      });
    }

    revalidatePath("/");
    revalidatePath("/live");

    return NextResponse.json({
      success: true,
      post_id: postId,
      boost_count: count ?? 1,
    });
  } catch (error) {
    console.error(error);
    return new NextResponse("Couldn't BOOST this post. Try again.", {
      status: 500,
    });
  }
}
