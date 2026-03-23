import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase-server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const postId = Number(id);

    if (!Number.isFinite(postId)) {
      return new NextResponse("Ungültige Post-ID.", { status: 400 });
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse("Nicht eingeloggt.", { status: 401 });
    }

    const { data: existingLike, error: existingLikeError } = await supabase
      .from("likes")
      .select("post_id")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingLikeError) {
      return new NextResponse(existingLikeError.message, { status: 500 });
    }

    const { data: post, error: postError } = await supabase
      .from("posts")
      .select("likes_count, user_id")
      .eq("id", postId)
      .single();

    if (postError) {
      return new NextResponse(postError.message, { status: 500 });
    }

    let authorUsername: string | null = null;

      if (post.user_id) {
        const { data: authorProfile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", post.user_id)
          .maybeSingle();

        authorUsername = authorProfile?.username ?? null;
      }

    const currentCount = post.likes_count ?? 0;

    if (existingLike) {
      const { error: deleteError } = await supabase
        .from("likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id);

      if (deleteError) {
        return new NextResponse(deleteError.message, { status: 500 });
      }

      const { error: updateError } = await supabase
        .from("posts")
        .update({ likes_count: Math.max(0, currentCount - 1) })
        .eq("id", postId);

      if (updateError) {
        return new NextResponse(updateError.message, { status: 500 });
      }

      revalidatePath("/");
      revalidatePath("/explore");
      revalidatePath("/following");
      if (authorUsername) {
        revalidatePath(`/u/${authorUsername}`);
      }

      return NextResponse.json({ liked: false });
    }

    const { error: insertError } = await supabase.from("likes").insert({
      post_id: postId,
      user_id: user.id,
    });

    if (insertError) {
      return new NextResponse(insertError.message, { status: 500 });
    }

    const { error: updateError } = await supabase
      .from("posts")
      .update({ likes_count: currentCount + 1 })
      .eq("id", postId);

    if (updateError) {
      return new NextResponse(updateError.message, { status: 500 });
    }

    revalidatePath("/");
    revalidatePath("/explore");
    revalidatePath("/following");
    if (authorUsername) {
      revalidatePath(`/u/${authorUsername}`);
    }

    return NextResponse.json({ liked: true });
  } catch (error) {
    console.error(error);
    return new NextResponse("Like konnte nicht gespeichert werden.", {
      status: 500,
    });
  }
}