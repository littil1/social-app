import Link from "next/link";
import { notFound } from "next/navigation";
import NavBar from "@/app/components/layout/navbar";
import SinglePostView from "@/app/components/posts/SinglePostView";
import { createClient } from "@/lib/supabase-server";
import type { FeedPost, ReactionCounts, ReactionType } from "@/types/feed";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// =====================================================
// Types
// =====================================================

type PageProps = {
  params: Promise<{ id: string }>;
};

type PostRow = {
  id: number;
  content: string | null;
  created_at: string;
  user_id: string | null;
  comments_count: number | null;
};

type ProfileRow = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  is_admin?: boolean | null;
};

type PostReactionRow = {
  post_id: number;
  user_id: string;
  reaction: ReactionType;
};

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

function getReactionsCount(counts: ReactionCounts) {
  return counts.like + counts.funny + counts.wow + counts.fire;
}

// =====================================================
// Page
// =====================================================

export default async function PostDetailPage({ params }: PageProps) {
  // =====================================================
  // Params
  // =====================================================

  const { id } = await params;
  const postId = Number(id);

  if (!Number.isFinite(postId)) {
    notFound();
  }

  // =====================================================
  // Auth / Nav User
  // =====================================================

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let viewerIsAdmin = false;

  let navUser: {
    username: string;
    avatar_url: string | null;
    is_admin: boolean;
  } | null = null;

  if (user) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      throw new Error(profileError.message);
    }

    const typedProfile = (profile ?? null) as ProfileRow | null;

    viewerIsAdmin = typedProfile?.is_admin ?? false;

    if (typedProfile?.username) {
      navUser = {
        username: typedProfile.username,
        avatar_url: typedProfile.avatar_url ?? null,
        is_admin: typedProfile.is_admin ?? false,
      };
    }
  }

  // =====================================================
  // Load Post
  // =====================================================

  const { data: postData, error: postError } = await supabase
    .from("posts")
    .select("id, content, created_at, user_id, comments_count")
    .eq("id", postId)
    .maybeSingle();

  if (postError) {
    throw new Error(postError.message);
  }

  if (!postData) {
    notFound();
  }

  const post = postData as PostRow;

  // =====================================================
  // Load Reactions / Comments
  // =====================================================

  const reactionCounts = createEmptyReactionCounts();
  let viewerReaction: ReactionType | null = null;

  const { data: reactionsData, error: reactionsError } = await supabase
    .from("post_reactions")
    .select("post_id, user_id, reaction")
    .eq("post_id", postId);

  if (reactionsError) {
    throw new Error(reactionsError.message);
  }

  for (const reaction of (reactionsData ?? []) as PostReactionRow[]) {
    reactionCounts[reaction.reaction] += 1;

    if (user && reaction.user_id === user.id) {
      viewerReaction = reaction.reaction;
    }
  }

  // =====================================================
  // Build Feed Post
  // =====================================================

  const initialPost: FeedPost = {
    id: post.id,
    content: post.content ?? "",
    created_at: post.created_at,
    reactions_count: getReactionsCount(reactionCounts),
    reaction_counts: reactionCounts,
    viewer_reaction: viewerReaction,
    comments_count: Math.max(0, post.comments_count ?? 0),
    can_delete: !!user && (post.user_id === user.id || viewerIsAdmin),
    author_username: null,
    author_avatar_url: null,
  };

  // =====================================================
  // Render
  // =====================================================

  return (
    <>
      <NavBar user={navUser} />

      <main className="mx-auto max-w-2xl p-6">
        {!user && (
          <div className="mb-6 rounded-xl bg-white p-4 shadow">
            <p className="mb-3 text-gray-700">
              Du musst eingeloggt sein, um zu interagieren.
            </p>
            <Link
              href="/login"
              className="inline-block rounded-lg bg-black px-4 py-2 text-white"
            >
              Anmelden / Registrieren
            </Link>
          </div>
        )}

        <SinglePostView initialPost={initialPost} />
      </main>
    </>
  );
}
