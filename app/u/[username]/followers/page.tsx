import NavBar from "@/app/navbar";
import UserListItem from "@/app/UserListItem";
import { createClient } from "@/lib/supabase-server";
import { getFollowersList } from "@/lib/follow-data";

export const dynamic = "force-dynamic";

type FollowersPageProps = {
  params: Promise<{
    username: string;
  }>;
};

export default async function FollowersPage({ params }: FollowersPageProps) {
  const supabase = await createClient();
  const { username } = await params;
  const usernameFromUrl = decodeURIComponent(username).trim().toLowerCase();

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

  const followers = await getFollowersList(supabase, profile.id);

  return (
    <>
      <NavBar />

      <main className="mx-auto max-w-2xl p-6">
        <h1 className="mb-6 text-3xl font-bold">
          Followers of @{profile.username}
        </h1>

        <div className="space-y-4">
          {followers.map((user) => (
            <UserListItem key={user.id} user={user} />
          ))}

          {followers.length === 0 && (
            <div className="rounded-xl bg-white p-6 text-center text-gray-500 shadow">
              No followers yet.
            </div>
          )}
        </div>
      </main>
    </>
  );
}