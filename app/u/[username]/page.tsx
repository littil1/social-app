import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import NavBar from "@/app/navbar";
import FollowButton from "@/app/FollowButton";
import PostCard from "@/app/PostCard";
import { getFollowCounts, isFollowingUser } from "@/lib/follow-data";
import {
  getImplementedIdeaCountByUserId,
} from "@/lib/feedback-data";
import { getPostsBundle, sortTrendingToday } from "@/lib/social-data";

export const dynamic = "force-dynamic";

type ProfilePageProps = {
  params: Promise<{
    username: string;
  }>;
};

export default async function ProfilePage({ params }: ProfilePageProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { username } = await params;
  const usernameFromUrl = decodeURIComponent(username).trim().toLowerCase();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, bio, avatar_url, created_at")
    .eq("username", usernameFromUrl)
    .maybeSingle();

  if (profileError || !profile) {
    return (
      <>
        <NavBar />

        <main className="mx-auto max-w-2xl p-6">
          <div className="rounded-xl bg-white p-6 shadow">
            <h1 className="text-2xl font-bold">Profile not found</h1>
          </div>
        </main>
      </>
    );
  }

  const posts = sortTrendingToday(
    await getPostsBundle(supabase, {
      viewerId: user?.id ?? null,
      userId: profile.id,
    })
  );

  const { followersCount, followingCount } = await getFollowCounts(
    supabase,
    profile.id
  );

  const isFollowing = await isFollowingUser(
    supabase,
    user?.id ?? null,
    profile.id
  );

  const implementedIdeaCount = await getImplementedIdeaCountByUserId(
    supabase,
    profile.id
  );

  const totalLikesToday = posts.reduce((sum, post) => sum + post.likeCountToday, 0);
  const isOwnProfile = user?.id === profile.id;

  return (
    <>
      <NavBar />

      <main className="mx-auto max-w-2xl p-6">
        <div className="mb-6 rounded-xl bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-2xl font-semibold text-gray-600">
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt={`${profile.username} avatar`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  profile.username.charAt(0).toUpperCase()
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold">@{profile.username}</h1>

                  {implementedIdeaCount > 0 && (
                    <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                      Contributor
                    </span>
                  )}
                </div>

                <p className="mt-1 text-sm text-gray-500">
                  Joined {new Date(profile.created_at).toLocaleDateString()}
                </p>

                {implementedIdeaCount > 0 && (
                  <p className="mt-1 text-sm text-amber-700">
                    {implementedIdeaCount} implemented{" "}
                    {implementedIdeaCount === 1 ? "idea" : "ideas"}
                  </p>
                )}
              </div>
            </div>

            <div>
              {isOwnProfile ? (
                <Link
                  href="/settings/profile"
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700"
                >
                  Edit profile
                </Link>
              ) : user ? (
                <FollowButton
                  isFollowing={isFollowing}
                  targetUserId={profile.id}
                  targetUsername={profile.username}
                  path={`/u/${profile.username}`}
                />
              ) : null}
            </div>
          </div>

          <p className="mb-4 whitespace-pre-wrap text-gray-700">
            {profile.bio ?? "No bio yet."}
          </p>

          <div className="flex flex-wrap gap-6 text-sm text-gray-600">
            <span>{posts.length} Posts</span>

            <Link
              href={`/u/${profile.username}/followers`}
              className="hover:underline"
            >
              {followersCount} Followers
            </Link>

            <Link
              href={`/u/${profile.username}/following`}
              className="hover:underline"
            >
              {followingCount} Following
            </Link>

            <span>{totalLikesToday} Likes today</span>
          </div>
        </div>

        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={user?.id ?? null}
              path={`/u/${profile.username}`}
            />
          ))}

          {posts.length === 0 && (
            <div className="rounded-xl bg-white p-6 text-center text-gray-500 shadow">
              No posts yet.
            </div>
          )}
        </div>
      </main>
    </>
  );
}