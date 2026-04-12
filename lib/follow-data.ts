import "server-only";

export type ProfileSummary = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  isCurrentUser: boolean;
};

export async function getFollowCounts(supabase: any, userId: string) {
  const [{ count: followersCount }, { count: followingCount }] = await Promise.all([
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", userId),
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", userId),
  ]);

  return {
    followersCount: followersCount ?? 0,
    followingCount: followingCount ?? 0,
  };
}

export async function isFollowingUser(
  supabase: any,
  viewerId: string | null | undefined,
  targetUserId: string
) {
  if (!viewerId || viewerId === targetUserId) return false;

  const { data } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_id", viewerId)
    .eq("following_id", targetUserId)
    .maybeSingle();

  return !!data;
}

export async function getFollowersList(
  supabase: any,
  userId: string,
  viewerId?: string | null
) {
  const { data: follows, error } = await supabase
    .from("follows")
    .select("follower_id, created_at")
    .eq("following_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const ids = (follows ?? []).map((row: any) => row.follower_id as string);

  if (ids.length === 0) return [] as ProfileSummary[];

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, bio")
    .in("id", ids);

  if (profilesError) throw new Error(profilesError.message);

  const profileMap = new Map(
    ((profiles ?? []) as Array<{
      id: string;
      username: string | null;
      avatar_url: string | null;
      bio: string | null;
    }>).map((profile) => [
      profile.id,
      {
        ...profile,
        isCurrentUser: profile.id === viewerId,
      } satisfies ProfileSummary,
    ])
  );

  return ids
    .map((id: string) => profileMap.get(id))
    .filter(Boolean) as ProfileSummary[];
}

export async function getFollowingList(
  supabase: any,
  userId: string,
  viewerId?: string | null
) {
  const { data: follows, error } = await supabase
    .from("follows")
    .select("following_id, created_at")
    .eq("follower_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const ids = (follows ?? []).map((row: any) => row.following_id as string);

  if (ids.length === 0) return [] as ProfileSummary[];

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, bio")
    .in("id", ids);

  if (profilesError) throw new Error(profilesError.message);

  const profileMap = new Map(
    ((profiles ?? []) as Array<{
      id: string;
      username: string | null;
      avatar_url: string | null;
      bio: string | null;
    }>).map((profile) => [
      profile.id,
      {
        ...profile,
        isCurrentUser: profile.id === viewerId,
      } satisfies ProfileSummary,
    ])
  );

  return ids
    .map((id: string) => profileMap.get(id))
    .filter(Boolean) as ProfileSummary[];
}

export async function getFollowingIds(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => row.following_id as string);
}