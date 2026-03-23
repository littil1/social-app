import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_: Request, context: RouteContext) {
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

    // Post laden
    const { data: post, error: postError } = await supabase
      .from("posts")
      .select("user_id")
      .eq("id", postId)
      .single();

    if (postError || !post) {
      return new NextResponse("Post nicht gefunden.", { status: 404 });
    }

    // Admin prüfen
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();

    const isAdmin = profile?.is_admin ?? false;
    const isOwner = post.user_id === user.id;

    if (!isOwner && !isAdmin) {
      return new NextResponse("Keine Berechtigung.", { status: 403 });
    }

    // Kommentare löschen
    await supabase.from("comments").delete().eq("post_id", postId);

    // Likes löschen
    await supabase.from("likes").delete().eq("post_id", postId);

    // Post löschen
    const { error: deleteError } = await supabase
      .from("posts")
      .delete()
      .eq("id", postId);

    if (deleteError) {
      return new NextResponse(deleteError.message, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(error);
    return new NextResponse("Post konnte nicht gelöscht werden.", {
      status: 500,
    });
  }
}