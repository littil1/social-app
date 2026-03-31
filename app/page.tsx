import NavBar from "./components/layout/navbar";
import { createClient } from "@/lib/supabase-server";
import HomeFeed from "@/app/components/posts/HomeFeed";
import { FEED_PAGE_SIZE, getFeedPage } from "@/lib/feed";
import LoginCta from "@/app/components/auth/LoginCta";

export const dynamic = "force-dynamic";

// =====================================================
// Component
// =====================================================

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let navUser: {
    username: string;
    avatar_url: string | null;
    is_admin: boolean;
  } | null = null;

  if (user) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("username, avatar_url, is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      throw new Error(profileError.message);
    }

    if (profile?.username) {
      navUser = {
        username: profile.username,
        avatar_url: profile.avatar_url ?? null,
        is_admin: profile.is_admin ?? false,
      };
    }
  }

  const initialPosts = await getFeedPage(0, FEED_PAGE_SIZE);

  return (
    <>
      <NavBar user={navUser} />

      <main className="mx-auto max-w-2xl p-6">
        {/* =====================================================
            Login CTA (nur wenn nicht eingeloggt)
        ===================================================== */}
        {!user && <LoginCta />}

        {/* =====================================================
            Feed
        ===================================================== */}
        <HomeFeed
          initialPosts={initialPosts}
          pageSize={FEED_PAGE_SIZE}
          isLoggedIn={!!user}
        />
      </main>
    </>
  );
}