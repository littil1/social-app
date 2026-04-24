import Link from "next/link";
import { redirect } from "next/navigation";
import NavBar from "@/shared/components/layout/navbar";
import AdminRecomputeButton from "@/features/admin/components/AdminRecomputeButton";
import AdminReportsPanel, {
  type ModerationReport,
} from "@/features/admin/components/AdminReportsPanel";
import AdminTabs from "@/features/admin/components/AdminTabs";
import { createClient } from "@/lib/supabase/server";
import { getUserBadges } from "@/features/badges/lib/getUserBadges";
import type { UserBadgeDisplay } from "@/features/badges/lib/profile-badges";

export const dynamic = "force-dynamic";

type AdminTabId = "reports" | "users" | "badges";

type AdminPageProps = {
  searchParams: Promise<{
    q?: string;
    user?: string;
    report?: string;
    tab?: string;
  }>;
};

type ProfileListRow = {
  id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
  is_admin: boolean | null;
};

type BadgeDefinitionListRow = {
  id: number;
  key: string;
  family: string;
  level: number;
  threshold: number;
  name: string;
  short_label: string;
  description: string | null;
  icon: string | null;
  color_token: string | null;
  sort_order: number;
};

type PostReportRow = {
  id: string;
  post_id: number;
  reporter_user_id: string;
  post_owner_user_id: string | null;
  reason: string;
  details: string | null;
  status: "open" | "reviewing" | "resolved" | "dismissed";
  admin_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

type CommentReportRow = {
  id: string;
  comment_id: number;
  reporter_user_id: string;
  comment_owner_user_id: string | null;
  reason: string;
  details: string | null;
  status: "open" | "reviewing" | "resolved" | "dismissed";
  admin_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

type PostPreviewRow = {
  id: number;
  content: string | null;
};

type CommentPreviewRow = {
  id: number;
  content: string | null;
  post_id: number;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function isMissingPostReportsTableError(message: string) {
  return message.includes("Could not find the table 'public.post_reports'");
}

function isMissingCommentReportsTableError(message: string) {
  return message.includes("Could not find the table 'public.comment_reports'");
}

function getInitialTab(value: string | undefined): AdminTabId {
  if (value === "reports" || value === "badges" || value === "users") {
    return value;
  }

  return "users";
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/leaderboard");
  }

  const { data: viewerProfile, error: viewerProfileError } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (viewerProfileError) {
    throw new Error(viewerProfileError.message);
  }

  if (!viewerProfile?.is_admin) {
    return (
      <>
        <NavBar
          user={
            viewerProfile?.username
              ? {
                  username: viewerProfile.username,
                  avatar_url: viewerProfile.avatar_url ?? null,
                  is_admin: viewerProfile.is_admin ?? false,
                }
              : null
          }
        />
        <main className="mx-auto max-w-4xl px-4 py-10 sm:py-16">
          <section className="rounded-[32px] border border-red-200 bg-red-50 p-8 text-center shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500">
              403
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-neutral-950">
              No access to the admin panel
            </h1>
            <p className="mt-3 text-sm font-medium text-neutral-600">
              This area is only available to admins.
            </p>
          </section>
        </main>
      </>
    );
  }

  const params = await searchParams;
  const initialTab = getInitialTab(params.tab);
  const searchQuery = typeof params.q === "string" ? params.q.trim() : "";
  const selectedUserId =
    typeof params.user === "string" ? params.user.trim() : "";
  const selectedReportId =
    typeof params.report === "string" ? params.report.trim() : "";

  let profileQuery = supabase
    .from("profiles")
    .select("id, username, avatar_url, created_at, is_admin")
    .order("username", { ascending: true })
    .limit(20);

  if (searchQuery.length > 0) {
    profileQuery = profileQuery.ilike("username", `%${searchQuery}%`);
  }

  const { data: profilesData, error: profilesError } = await profileQuery;

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  const users = (profilesData ?? []) as ProfileListRow[];
  const userIds = users.map((profile) => profile.id);
  const userBadgesMap = await getUserBadges(userIds);
  const userBadgeCountMap = new Map(
    users.map((profile) => [
      profile.id,
      userBadgesMap.get(profile.id)?.length ?? 0,
    ])
  );

  let selectedUser =
    users.find((profile) => profile.id === selectedUserId) ?? null;

  if (!selectedUser && selectedUserId) {
    const { data: selectedProfileData, error: selectedProfileError } =
      await supabase
        .from("profiles")
        .select("id, username, avatar_url, created_at, is_admin")
        .eq("id", selectedUserId)
        .maybeSingle();

    if (selectedProfileError) {
      throw new Error(selectedProfileError.message);
    }

    selectedUser = (selectedProfileData as ProfileListRow | null) ?? null;
  }

  const { data: badgeDefinitionsData, error: badgeDefinitionsError } =
    await supabase
      .from("badges")
      .select(
        "id, key, family, level, threshold, name, short_label, description, icon, color_token, sort_order"
      )
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

  if (badgeDefinitionsError) {
    throw new Error(badgeDefinitionsError.message);
  }

  const badgeDefinitions =
    (badgeDefinitionsData ?? []) as BadgeDefinitionListRow[];

  const selectedUserBadges: UserBadgeDisplay[] = selectedUser
    ? userBadgesMap.get(selectedUser.id) ?? []
    : [];
  const badgeFamiliesCount = new Set(
    selectedUserBadges.map((badge) => badge.family)
  ).size;

  const { data: postReportsData, error: postReportsError } = await supabase
    .from("post_reports")
    .select("*")
    .limit(100);

  const { data: commentReportsData, error: commentReportsError } =
    await supabase.from("comment_reports").select("*").limit(100);

  const postReportsReady = !postReportsError;
  const commentReportsReady =
    !commentReportsError ||
    isMissingCommentReportsTableError(commentReportsError.message);
  const moderationReady = postReportsReady && commentReportsReady;

  const moderationUnavailableReason = postReportsError
    ? isMissingPostReportsTableError(postReportsError.message)
      ? "The post_reports table is not available in the database yet. Run the new migration first."
      : postReportsError.message
    : null;

  if (
    postReportsError &&
    !isMissingPostReportsTableError(postReportsError.message)
  ) {
    throw new Error(postReportsError.message);
  }

  if (
    commentReportsError &&
    !isMissingCommentReportsTableError(commentReportsError.message)
  ) {
    throw new Error(commentReportsError.message);
  }

  const postReports = (postReportsData ?? []) as PostReportRow[];
  const commentReports = (commentReportsData ?? []) as CommentReportRow[];

  const reportedPostIds = Array.from(
    new Set(postReports.map((report) => report.post_id))
  );
  const reportedCommentIds = Array.from(
    new Set(commentReports.map((report) => report.comment_id))
  );
  const moderationUserIds = Array.from(
    new Set(
      [
        ...postReports.flatMap((report) => [
          report.reporter_user_id,
          report.post_owner_user_id,
          report.reviewed_by,
        ]),
        ...commentReports.flatMap((report) => [
          report.reporter_user_id,
          report.comment_owner_user_id,
          report.reviewed_by,
        ]),
      ].filter((value): value is string => typeof value === "string")
    )
  );

  let reportedPostsMap = new Map<number, PostPreviewRow>();

  if (reportedPostIds.length > 0) {
    const { data: reportedPostsData, error: reportedPostsError } =
      await supabase
        .from("posts")
        .select("id, content")
        .in("id", reportedPostIds);

    if (reportedPostsError) {
      throw new Error(reportedPostsError.message);
    }

    reportedPostsMap = new Map(
      ((reportedPostsData ?? []) as PostPreviewRow[]).map((post) => [
        post.id,
        post,
      ])
    );
  }

  let reportedCommentsMap = new Map<number, CommentPreviewRow>();

  if (reportedCommentIds.length > 0) {
    const { data: reportedCommentsData, error: reportedCommentsError } =
      await supabase
        .from("comments")
        .select("id, content, post_id")
        .in("id", reportedCommentIds);

    if (reportedCommentsError) {
      throw new Error(reportedCommentsError.message);
    }

    reportedCommentsMap = new Map(
      ((reportedCommentsData ?? []) as CommentPreviewRow[]).map((comment) => [
        comment.id,
        comment,
      ])
    );
  }

  let moderationProfilesMap = new Map<string, { username: string }>();

  if (moderationUserIds.length > 0) {
    const { data: moderationProfilesData, error: moderationProfilesError } =
      await supabase
        .from("profiles")
        .select("id, username")
        .in("id", moderationUserIds);

    if (moderationProfilesError) {
      throw new Error(moderationProfilesError.message);
    }

    moderationProfilesMap = new Map(
      ((moderationProfilesData ?? []) as Array<{ id: string; username: string }>)
        .map((profile) => [profile.id, { username: profile.username }])
    );
  }

  const moderationReports: ModerationReport[] = [
    ...postReports.map((report) => ({
      id: report.id,
      target_type: "post" as const,
      target_id: report.post_id,
      post_id: report.post_id,
      reporter_user_id: report.reporter_user_id,
      owner_user_id: report.post_owner_user_id,
      reason: report.reason,
      details: report.details,
      status: report.status,
      admin_note: report.admin_note,
      reviewed_by: report.reviewed_by,
      reviewed_at: report.reviewed_at,
      created_at: report.created_at,
      updated_at: report.updated_at,
    })),
    ...commentReports.map((report) => ({
      id: report.id,
      target_type: "comment" as const,
      target_id: report.comment_id,
      post_id: reportedCommentsMap.get(report.comment_id)?.post_id ?? null,
      reporter_user_id: report.reporter_user_id,
      owner_user_id: report.comment_owner_user_id,
      reason: report.reason,
      details: report.details,
      status: report.status,
      admin_note: report.admin_note,
      reviewed_by: report.reviewed_by,
      reviewed_at: report.reviewed_at,
      created_at: report.created_at,
      updated_at: report.updated_at,
    })),
  ];

  const usersTab = (
    <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-[32px] border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">
              Users
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-neutral-950">
              Search users
            </h2>
          </div>

          <form action="/admin" className="flex gap-2">
            <input type="hidden" name="tab" value="users" />
            <input
              type="text"
              name="q"
              defaultValue={searchQuery}
              placeholder="Search username..."
              className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-medium outline-none transition focus:border-neutral-950 focus:bg-white"
            />
            <button
              type="submit"
              className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-bold text-neutral-950 shadow-sm"
            >
              Search
            </button>
          </form>
        </div>

        <div className="mt-6 grid gap-3">
          {users.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-5 text-sm text-neutral-500">
              No users found for this search.
            </div>
          ) : (
            users.map((profile) => {
              const isActive = selectedUser?.id === profile.id;
              const href =
                searchQuery.length > 0
                  ? `/admin?tab=users&user=${encodeURIComponent(profile.id)}&q=${encodeURIComponent(searchQuery)}`
                  : `/admin?tab=users&user=${encodeURIComponent(profile.id)}`;

              return (
                <Link
                  key={profile.id}
                  href={href}
                  className={`flex items-center justify-between rounded-2xl border px-4 py-3 transition ${
                    isActive
                      ? "border-neutral-950 bg-neutral-950 text-white"
                      : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">
                      @{profile.username}
                    </p>
                    <p
                      className={`text-xs ${
                        isActive ? "text-white/70" : "text-neutral-500"
                      }`}
                    >
                      {userBadgeCountMap.get(profile.id) ?? 0} badges | Created
                      on {formatDateTime(profile.created_at)}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-black uppercase tracking-[0.18em] ${
                      isActive ? "text-emerald-300" : "text-neutral-400"
                    }`}
                  >
                    {isActive ? "Active" : "Open"}
                  </span>
                </Link>
              );
            })
          )}
        </div>
      </section>

      <section className="rounded-[32px] border border-neutral-200 bg-white p-6 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">
          User Detail
        </p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-neutral-950">
          User Details
        </h2>

        {!selectedUser ? (
          <div className="mt-6 rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-5 text-sm text-neutral-500">
            Select a user to inspect badges.
          </div>
        ) : (
          <div className="mt-6 space-y-8">
            <section className="rounded-3xl border border-neutral-200 bg-neutral-50 p-5">
              <p className="text-xl font-black text-neutral-950">
                @{selectedUser.username}
              </p>
              <div className="mt-3 grid gap-2 text-sm text-neutral-600">
                <p>
                  User ID: <span className="font-mono">{selectedUser.id}</span>
                </p>
                <p>Status: {selectedUser.is_admin ? "Admin" : "User"}</p>
                <p>
                  Profile created: {formatDateTime(selectedUser.created_at)}
                </p>
              </div>
              <div className="mt-4 border-t border-neutral-200 pt-4 text-sm text-neutral-600">
                <span className="font-medium text-neutral-950">
                  Badges: {selectedUserBadges.length}
                </span>
                {" | "}
                <span className="font-medium text-neutral-950">
                  Families: {badgeFamiliesCount}
                </span>
              </div>
            </section>

            <section className="rounded-3xl border border-neutral-200 bg-white p-5">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-neutral-400">
                Badge Actions
              </p>
              <div className="mt-4">
                <AdminRecomputeButton
                  userId={selectedUser.id}
                  username={selectedUser.username}
                />
              </div>
              <p className="mt-4 text-xs text-neutral-500">
                Optionally select individual families. With no selection, a full
                recompute is run for the user.
              </p>
            </section>

            <section className="rounded-3xl border border-neutral-200 bg-white p-5">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-neutral-400">
                Badge Details
              </p>

              {selectedUserBadges.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-5 text-sm text-neutral-500">
                  This user currently has no badges from the central system.
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {selectedUserBadges.map((badge) => (
                    <div
                      key={badge.id}
                      className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold shadow-sm ${badge.className}`}
                          title={badge.description}
                        >
                          <span aria-hidden="true">{badge.icon}</span>
                          <span>{badge.label}</span>
                        </span>
                        <span className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-400">
                          {badge.family}
                        </span>
                      </div>

                      <div className="mt-3 grid gap-2 text-sm text-neutral-600">
                        <p>
                          Awarded on:{" "}
                          <span className="font-medium text-neutral-950">
                            {formatDateTime(badge.awardedAt)}
                          </span>
                        </p>
                        <p>
                          Progress:{" "}
                          <span className="font-medium text-neutral-950">
                            {badge.progressValue ?? "-"}
                          </span>
                        </p>
                        <p>
                          Level / Threshold:{" "}
                          <span className="font-medium text-neutral-950">
                            {badge.level} / {badge.threshold}
                          </span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </section>
    </section>
  );

  const reportsTab = (
    <AdminReportsPanel
      initialReports={moderationReports}
      initialSelectedReportId={selectedReportId}
      moderationReady={moderationReady}
      moderationUnavailableReason={moderationUnavailableReason}
      targetPreviewsByKey={{
        ...Object.fromEntries(
          Array.from(reportedPostsMap.entries()).map(([id, post]) => [
            `post:${id}`,
            post.content?.trim() || "Post is no longer available.",
          ])
        ),
        ...Object.fromEntries(
          Array.from(reportedCommentsMap.entries()).map(([id, comment]) => [
            `comment:${id}`,
            comment.content?.trim() || "Comment is no longer available.",
          ])
        ),
      }}
      usernamesById={Object.fromEntries(
        Array.from(moderationProfilesMap.entries()).map(([id, profile]) => [
          id,
          profile.username,
        ])
      )}
    />
  );

  const badgesTab = (
    <section className="rounded-[32px] border border-neutral-200 bg-white p-6 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">
        Definitions
      </p>
      <h2 className="mt-2 text-2xl font-black tracking-tight text-neutral-950">
        Badge Definitions
      </h2>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-400">
            <tr>
              <th className="pb-3 pr-4">Badge</th>
              <th className="pb-3 pr-4">Family</th>
              <th className="pb-3 pr-4">Level</th>
              <th className="pb-3 pr-4">Threshold</th>
            </tr>
          </thead>
          <tbody>
            {badgeDefinitions.map((badge) => (
              <tr key={badge.id} className="border-t border-neutral-100">
                <td className="py-3 pr-4">
                  <div className="font-bold text-neutral-950">
                    {badge.icon ?? "🏅"} {badge.short_label}
                  </div>
                  <div className="text-xs text-neutral-500">{badge.key}</div>
                </td>
                <td className="py-3 pr-4 text-neutral-700">{badge.family}</td>
                <td className="py-3 pr-4 text-neutral-700">{badge.level}</td>
                <td className="py-3 pr-4 text-neutral-700">
                  {badge.threshold}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );

  return (
    <>
      <NavBar
        user={{
          username: viewerProfile.username,
          avatar_url: viewerProfile.avatar_url ?? null,
          is_admin: viewerProfile.is_admin ?? false,
        }}
      />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <section className="rounded-[36px] border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">
            Admin
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-neutral-950 sm:text-4xl">
            Control Panel
          </h1>
          <p className="mt-3 max-w-3xl text-sm font-medium text-neutral-600">
            A clear surface for moderation, user diagnostics, and badge
            management using the existing server helpers.
          </p>
        </section>

        <AdminTabs
          initialTab={initialTab}
          tabs={[
            { id: "reports", label: "Reports", content: reportsTab },
            { id: "users", label: "Users", content: usersTab },
            { id: "badges", label: "Badges", content: badgesTab },
          ]}
        />
      </main>
    </>
  );
}


