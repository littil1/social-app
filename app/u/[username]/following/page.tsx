import UserListItem from "@/features/profile/components/UserListItem";
import { createClient } from "@/lib/supabase/server";
import { getFollowingList } from "@/features/profile/lib/follow-data";
import Link from "next/link";

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
      <main className="mx-auto max-w-2xl p-6">
        <div className="rounded-[32px] border border-neutral-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-black tracking-tight text-neutral-950">Profile not found</h1>
        </div>
      </main>
    );
  }

  const following = await getFollowingList(supabase, profile.id, currentUserId);

  return (
    <main className="mx-auto max-w-2xl px-4 pb-32 pt-6 sm:px-6 sm:pt-10">
        <section className="relative mb-6 overflow-hidden rounded-[32px] border border-neutral-100 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.10),transparent_36%),linear-gradient(135deg,#ffffff,#fffdf8)] p-6 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.42)] sm:p-8">
          <Link
            href={`/u/${profile.username}`}
            className="text-[10px] font-black uppercase tracking-[0.22em] text-neutral-400 hover:text-neutral-950"
          >
            Back to profile
          </Link>
          <div className="mt-5 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-bold text-neutral-500">
                @{profile.username}
              </p>
              <h1 className="mt-1 text-4xl font-black tracking-tight text-neutral-950">
                Following
              </h1>
            </div>
            <div className="rounded-2xl border border-neutral-100 bg-white/80 px-4 py-3 text-center shadow-inner">
              <p className="text-2xl font-black leading-none tabular-nums text-neutral-950">
                {following.length}
              </p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-neutral-500">
                Total
              </p>
            </div>
          </div>
        </section>

        {following.length > 0 && (
          <p className="mb-3 px-1 text-[10px] font-black uppercase tracking-[0.24em] text-neutral-400">
            Social graph
          </p>
        )}

        <div className="space-y-4">
          {following.map((user) => (
            <UserListItem key={user.id} user={user} />
          ))}

          {following.length === 0 && (
            <div className="rounded-[32px] border border-dashed border-neutral-200 bg-white p-8 text-center shadow-[0_18px_50px_-42px_rgba(15,23,42,0.48)]">
              <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-lg">
                +
              </div>
              <p className="text-sm font-medium text-neutral-500">
                Not following anyone yet.
              </p>
            </div>
          )}
        </div>
    </main>
  );
}

