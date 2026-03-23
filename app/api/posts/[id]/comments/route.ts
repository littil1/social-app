import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import type { Database } from "@/types/database";
import type { FeedComment } from "@/types/feed";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type PostRow = Database["public"]["Tables"]["posts"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type HallOfFameRow =
  Database["public"]["Tables"]["weekly_post_hall_of_fame"]["Row"];

type CommentRow = Database["public"]["Tables"]["comments"]["Row"];

export async function GET(_: NextRequest, context: RouteContext) {
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

    let viewerIsAdmin = false;

    if (user) {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        return new NextResponse(profileError.message, { status: 500 });
      }

      viewerIsAdmin = profileData?.is_admin ?? false;
    }

    const { data, error } = await supabase
      .from("comments")
      .select("id, content, created_at, user_id")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) {
      return new NextResponse(error.message, { status: 500 });
    }

    const commentRows = (data ?? []) as Pick<
      CommentRow,
      "id" | "content" | "created_at" | "user_id"
    >[];

    const authorIds = Array.from(
      new Set(
        commentRows
          .map((comment) => comment.user_id)
          .filter((userId): userId is string => typeof userId === "string")
      )
    );

    let profilesById = new Map<string, ProfileRow>();
    let hallOfFameStatsByAuthorId = new Map<
      string,
      {
        count: number;
        categories: string[];
      }
    >();

    if (authorIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, bio, created_at, updated_at, is_admin")
        .in("id", authorIds);

      if (profilesError) {
        return new NextResponse(profilesError.message, { status: 500 });
      }

      const profiles = (profilesData ?? []) as ProfileRow[];
      profilesById = new Map(profiles.map((profile) => [profile.id, profile]));

      const { data: hallOfFameData, error: hallOfFameError } = await supabase
        .from("weekly_post_hall_of_fame")
        .select("author_id, category")
        .in("author_id", authorIds);

      if (hallOfFameError) {
        return new NextResponse(hallOfFameError.message, { status: 500 });
      }

      const hallOfFameEntries = (hallOfFameData ?? []) as Pick<
        HallOfFameRow,
        "author_id" | "category"
      >[];

      for (const entry of hallOfFameEntries) {
        if (!entry.author_id) continue;

        const existing = hallOfFameStatsByAuthorId.get(entry.author_id) ?? {
          count: 0,
          categories: [],
        };

        existing.count += 1;

        if (!existing.categories.includes(entry.category)) {
          existing.categories.push(entry.category);
        }

        hallOfFameStatsByAuthorId.set(entry.author_id, existing);
      }
    }

    const comments: FeedComment[] = commentRows.map((comment) => {
      const profile =
        comment.user_id ? profilesById.get(comment.user_id) ?? null : null;
      const hallOfFameStats =
        comment.user_id
          ? hallOfFameStatsByAuthorId.get(comment.user_id) ?? null
          : null;

      return {
        id: comment.id,
        content: comment.content,
        created_at: comment.created_at,
        can_delete: !!user && (comment.user_id === user.id || viewerIsAdmin),
        author_username: profile?.username ?? null,
        author_avatar_url: profile?.avatar_url ?? null,
        author_hall_of_fame_count: hallOfFameStats?.count ?? 0,
        author_hall_of_fame_categories: hallOfFameStats?.categories ?? [],
      };
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error(error);
    return new NextResponse("Kommentare konnten nicht geladen werden.", {
      status: 500,
    });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
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

    const body = await request.json();
    const content = String(body?.content ?? "").trim();

    if (!content) {
      return new NextResponse("Kommentar-Inhalt fehlt.", { status: 400 });
    }

    const { data: insertedComment, error: insertError } = await supabase
      .from("comments")
      .insert({
        post_id: postId,
        user_id: user.id,
        content,
      })
      .select("id, content, created_at, user_id")
      .single();

    if (insertError || !insertedComment) {
      return new NextResponse(
        insertError?.message ?? "Kommentar konnte nicht erstellt werden.",
        {
          status: 500,
        }
      );
    }

    const { data: postData, error: postError } = await supabase
      .from("posts")
      .select("*")
      .eq("id", postId)
      .single();

    if (postError || !postData) {
      return new NextResponse(postError?.message ?? "Post nicht gefunden.", {
        status: 500,
      });
    }

    const post = postData as PostRow;
    const currentCount = post.comments_count ?? 0;

    const { error: updateError } = await supabase
      .from("posts")
      .update({
        comments_count: currentCount + 1,
      })
      .eq("id", postId);

    if (updateError) {
      return new NextResponse(updateError.message, { status: 500 });
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, bio, created_at, updated_at, is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return new NextResponse(profileError.message, { status: 500 });
    }

    const profile = (profileData ?? null) as ProfileRow | null;

    const { data: hallOfFameData, error: hallOfFameError } = await supabase
      .from("weekly_post_hall_of_fame")
      .select("author_id, category")
      .eq("author_id", user.id);

    if (hallOfFameError) {
      return new NextResponse(hallOfFameError.message, { status: 500 });
    }

    const hallOfFameEntries = (hallOfFameData ?? []) as Pick<
      HallOfFameRow,
      "author_id" | "category"
    >[];

    const authorHallOfFameCategories = Array.from(
      new Set(hallOfFameEntries.map((entry) => entry.category))
    );

    const response: FeedComment = {
      id: insertedComment.id,
      content: insertedComment.content,
      created_at: insertedComment.created_at,
      can_delete: true,
      author_username: profile?.username ?? null,
      author_avatar_url: profile?.avatar_url ?? null,
      author_hall_of_fame_count: hallOfFameEntries.length,
      author_hall_of_fame_categories: authorHallOfFameCategories,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(error);
    return new NextResponse("Kommentar konnte nicht gespeichert werden.", {
      status: 500,
    });
  }
}