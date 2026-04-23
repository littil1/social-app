import NavBar from "@/components/layout/navbar";
import UserListItem from "@/components/profile/UserListItem";
import { createClient } from "@/lib/supabase/server";
import { getFollowingList } from "@/lib/profile/follow-data";

export const dynamic = "force-dynamic";

type FollowingListPageProps = {
  params: Promise<{
    username: string;
  }>;
};

export default async function FollowingListPage({
  params,
}: FollowingListPageProps) {
  const supabase = await createClient();
  const { username } = await params;
  const usernameFromUrl = decodeURIComponent(username).trim().toLowerCase();

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  const currentUserId = currentUser?.id ?? null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("username", usernameFromUrl)
    .maybeSingle();

  if (!profile) {
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

  const following = await getFollowingList(supabase, profile.id, currentUserId);

  return (
    <>
      <NavBar />

      <main className="mx-auto max-w-2xl p-6">
        <h1 className="mb-6 text-3xl font-bold">
          @{profile.username} is following
        </h1>

        <div className="space-y-4">
          {following.map((user) => (
            <UserListItem key={user.id} user={user} />
          ))}

          {following.length === 0 && (
            <div className="rounded-xl bg-white p-6 text-center text-gray-500 shadow">
              Not following anyone yet.
            </div>
          )}
        </div>
      </main>
    </>
  );
}
