import Link from "next/link";
import { redirect } from "next/navigation";
import AdminRecomputeButton from "@/features/admin/components/AdminRecomputeButton";
import AdminModerationPanel, {
  type AdminModerationQueueItem,
} from "@/features/admin/components/AdminModerationPanel";
import AdminTabs from "@/features/admin/components/AdminTabs";
import { createClient } from "@/lib/supabase/server";
import { getUserBadges } from "@/features/badges/lib/getUserBadges";
import type { UserBadgeDisplay } from "@/features/badges/lib/profile-badges";

export const dynamic = "force-dynamic";

type AdminTabId = "moderation" | "users" | "badges";

type AdminPageProps = {
  searchParams: Promise<{
    q?: string;
    user?: string;
    tab?: string;
    case?: string;
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
  user_id: string | null;
  created_at: string;
  moderation_status: "clean" | "reported" | "blurred" | "removed";
  moderation_reason: string | null;
  moderation_report_count: number;
  moderation_ai_summary: string | null;
  moderation_ai_categories: unknown;
  moderation_ai_scores: Record<string, number> | null;
  moderation_ai_checked_at: string | null;
  moderation_reviewed_by: string | null;
  moderation_reviewed_at: string | null;
};

type CommentPreviewRow = {
  id: number;
  content: string | null;
  post_id: number;
  user_id: string;
  created_at: string;
  moderation_status: "clean" | "reported" | "blurred" | "removed";
  moderation_reason: string | null;
  moderation_report_count: number;
  moderation_ai_summary: string | null;
  moderation_ai_categories: unknown;
  moderation_ai_scores: Record<string, number> | null;
  moderation_ai_checked_at: string | null;
  moderation_reviewed_by: string | null;
  moderation_reviewed_at: string | null;
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
  if (
    value === "moderation" ||
    value === "badges" ||
    value === "users"
  ) {
    return value;
  }

  return "moderation";
}

function isAdminTab(value: string | undefined): value is AdminTabId {
  return value === "moderation" || value === "users" || value === "badges";
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/live");
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
      <main className="mx-auto w-full max-w-4xl overflow-x-hidden px-4 pb-28 pt-8 sm:px-6 sm:pt-12">
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
    );
  }

  const params = await searchParams;
  const initialTab = getInitialTab(params.tab);
  const hasWorkspace = isAdminTab(params.tab);
  const selectedCaseKey =
    typeof params.case === "string" ? params.case.trim() : "";
  const searchQuery = typeof params.q === "string" ? params.q.trim() : "";
  const selectedUserId =
    typeof params.user === "string" ? params.user.trim() : "";

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
  const reportUserIds = Array.from(
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
        .select("id, content, user_id, created_at, moderation_status, moderation_reason, moderation_report_count, moderation_ai_summary, moderation_ai_categories, moderation_ai_scores, moderation_ai_checked_at, moderation_reviewed_by, moderation_reviewed_at")
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

  const { data: moderatedPostsData, error: moderatedPostsError } = await supabase
    .from("posts")
    .select("id, content, user_id, created_at, moderation_status, moderation_reason, moderation_report_count, moderation_ai_summary, moderation_ai_categories, moderation_ai_scores, moderation_ai_checked_at, moderation_reviewed_by, moderation_reviewed_at")
    .in("moderation_status", ["reported", "blurred", "removed"])
    .limit(100);

  if (moderatedPostsError) {
    throw new Error(moderatedPostsError.message);
  }

  for (const post of (moderatedPostsData ?? []) as PostPreviewRow[]) {
    reportedPostsMap.set(post.id, post);
  }

  let reportedCommentsMap = new Map<number, CommentPreviewRow>();

  if (reportedCommentIds.length > 0) {
    const { data: reportedCommentsData, error: reportedCommentsError } =
      await supabase
        .from("comments")
        .select("id, content, post_id, user_id, created_at, moderation_status, moderation_reason, moderation_report_count, moderation_ai_summary, moderation_ai_categories, moderation_ai_scores, moderation_ai_checked_at, moderation_reviewed_by, moderation_reviewed_at")
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

  const { data: moderatedCommentsData, error: moderatedCommentsError } =
    await supabase
      .from("comments")
      .select("id, content, post_id, user_id, created_at, moderation_status, moderation_reason, moderation_report_count, moderation_ai_summary, moderation_ai_categories, moderation_ai_scores, moderation_ai_checked_at, moderation_reviewed_by, moderation_reviewed_at")
      .in("moderation_status", ["reported", "blurred", "removed"])
      .limit(100);

  if (moderatedCommentsError) {
    throw new Error(moderatedCommentsError.message);
  }

  for (const comment of (moderatedCommentsData ?? []) as CommentPreviewRow[]) {
    reportedCommentsMap.set(comment.id, comment);
  }

  const moderationUserIds = Array.from(
    new Set(
      [
        ...reportUserIds,
        ...Array.from(reportedPostsMap.values()).flatMap((post) => [
          post.user_id,
          post.moderation_reviewed_by,
        ]),
        ...Array.from(reportedCommentsMap.values()).map(
          (comment) => comment.user_id
        ),
        ...Array.from(reportedCommentsMap.values()).map(
          (comment) => comment.moderation_reviewed_by
        ),
      ].filter((value): value is string => typeof value === "string")
    )
  );

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

  const postReportsByPostId = new Map<number, PostReportRow[]>();
  for (const report of postReports) {
    postReportsByPostId.set(report.post_id, [
      ...(postReportsByPostId.get(report.post_id) ?? []),
      report,
    ]);
  }

  const commentReportsByCommentId = new Map<number, CommentReportRow[]>();
  for (const report of commentReports) {
    commentReportsByCommentId.set(report.comment_id, [
      ...(commentReportsByCommentId.get(report.comment_id) ?? []),
      report,
    ]);
  }

  const mapPostReport = (report: PostReportRow) => ({
    id: report.id,
    reporter_user_id: report.reporter_user_id,
    reporter_username:
      moderationProfilesMap.get(report.reporter_user_id)?.username ?? null,
    reason: report.reason,
    details: report.details,
    status: report.status,
    admin_note: report.admin_note,
    reviewed_by: report.reviewed_by,
    reviewed_by_username: report.reviewed_by
      ? moderationProfilesMap.get(report.reviewed_by)?.username ?? null
      : null,
    reviewed_at: report.reviewed_at,
    created_at: report.created_at,
    updated_at: report.updated_at,
  });

  const mapCommentReport = (report: CommentReportRow) => ({
    id: report.id,
    reporter_user_id: report.reporter_user_id,
    reporter_username:
      moderationProfilesMap.get(report.reporter_user_id)?.username ?? null,
    reason: report.reason,
    details: report.details,
    status: report.status,
    admin_note: report.admin_note,
    reviewed_by: report.reviewed_by,
    reviewed_by_username: report.reviewed_by
      ? moderationProfilesMap.get(report.reviewed_by)?.username ?? null
      : null,
    reviewed_at: report.reviewed_at,
    created_at: report.created_at,
    updated_at: report.updated_at,
  });

  const moderationItems: AdminModerationQueueItem[] = [
    ...Array.from(reportedPostsMap.values())
      .map((post) => {
        const reports = postReportsByPostId.get(post.id) ?? [];
        const latestReport = [...reports].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];

        return {
          key: `post:${post.id}`,
          target_type: "post" as const,
          target_id: post.id,
          post_id: post.id,
          content: post.content?.trim() ?? "",
          author_username: post.user_id
            ? moderationProfilesMap.get(post.user_id)?.username ?? null
            : null,
          created_at: post.created_at,
          report_count: post.moderation_report_count,
          latest_reported_at: latestReport?.created_at ?? null,
          moderation_status: post.moderation_status,
          moderation_reason: post.moderation_reason,
          moderation_reviewed_by_username: post.moderation_reviewed_by
            ? moderationProfilesMap.get(post.moderation_reviewed_by)?.username ??
              null
            : null,
          moderation_reviewed_at: post.moderation_reviewed_at,
          moderation_ai_summary: post.moderation_ai_summary,
          moderation_ai_categories: post.moderation_ai_categories,
          moderation_ai_scores: post.moderation_ai_scores,
          moderation_ai_checked_at: post.moderation_ai_checked_at,
          reports: reports.map(mapPostReport),
        };
      }),
    ...Array.from(reportedCommentsMap.values())
      .map((comment) => {
        const reports = commentReportsByCommentId.get(comment.id) ?? [];
        const latestReport = [...reports].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];

        return {
          key: `comment:${comment.id}`,
          target_type: "comment" as const,
          target_id: comment.id,
          post_id: comment.post_id,
          content: comment.content?.trim() ?? "",
          author_username:
            moderationProfilesMap.get(comment.user_id)?.username ?? null,
          created_at: comment.created_at,
          report_count: comment.moderation_report_count,
          latest_reported_at: latestReport?.created_at ?? null,
          moderation_status: comment.moderation_status,
          moderation_reason: comment.moderation_reason,
          moderation_reviewed_by_username: comment.moderation_reviewed_by
            ? moderationProfilesMap.get(comment.moderation_reviewed_by)
                ?.username ?? null
            : null,
          moderation_reviewed_at: comment.moderation_reviewed_at,
          moderation_ai_summary: comment.moderation_ai_summary,
          moderation_ai_categories: comment.moderation_ai_categories,
          moderation_ai_scores: comment.moderation_ai_scores,
          moderation_ai_checked_at: comment.moderation_ai_checked_at,
          reports: reports.map(mapCommentReport),
        };
      }),
  ].filter(
    (item) =>
      item.reports.length > 0 ||
      item.moderation_status === "reported" ||
      item.moderation_status === "blurred" ||
      item.moderation_status === "removed"
  );

  const openModerationItemsCount = moderationItems.filter(
    (item) =>
      item.moderation_status === "reported" ||
      item.reports.some(
        (report) => report.status === "open" || report.status === "reviewing"
      )
  ).length;
  const archivedModerationItemsCount =
    moderationItems.length - openModerationItemsCount;

  const usersTab = (
    <section className="grid w-full min-w-0 gap-5 overflow-hidden lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-6">
      <section className="min-w-0 overflow-hidden rounded-[32px] border border-neutral-200 bg-[#fffdf8] p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">
              Users
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-neutral-950">
              Search users
            </h2>
          </div>

          <form action="/admin" className="flex min-w-0 flex-col gap-2 sm:flex-row">
            <input type="hidden" name="tab" value="users" />
            <input
              type="text"
              name="q"
              defaultValue={searchQuery}
              placeholder="Search username..."
              className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-medium outline-none transition placeholder:text-neutral-500 focus:border-neutral-950 focus:bg-white"
            />
            <button
              type="submit"
              className="motion-button rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-bold text-neutral-950 shadow-sm"
            >
              Search
            </button>
          </form>
        </div>

        <div className="mt-5 grid gap-2.5">
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
                  className={`motion-card flex min-w-0 items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition ${
                    isActive
                      ? "border-emerald-200 bg-emerald-950/90 text-white shadow-[0_18px_36px_-28px_rgba(6,95,70,0.75)]"
                      : "border-neutral-200 bg-white/90 hover:border-amber-200 hover:bg-amber-50/30"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">
                      @{profile.username}
                    </p>
                    <p
                      className={`break-words text-xs [overflow-wrap:anywhere] ${
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
                    } shrink-0`}
                  >
                    {isActive ? "Active" : "Open"}
                  </span>
                </Link>
              );
            })
          )}
        </div>
      </section>

      <section className="min-w-0 overflow-hidden rounded-[32px] border border-neutral-200 bg-[#fffdf8] p-5 shadow-sm sm:p-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">
          User Detail
        </p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-neutral-950">
          User Details
        </h2>

        {!selectedUser ? (
          <div className="mt-5 rounded-[28px] border border-dashed border-neutral-200 bg-neutral-50 px-5 py-10 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-neutral-400">
              Waiting for selection
            </p>
            <p className="mx-auto mt-3 max-w-sm text-sm font-medium text-neutral-500">
              Select a user to inspect badges.
            </p>
          </div>
        ) : (
          <div className="mt-5 min-w-0 space-y-5">
            <section className="min-w-0 overflow-hidden rounded-3xl border border-neutral-200 bg-neutral-50 p-5">
              <p className="break-words text-xl font-black text-neutral-950 [overflow-wrap:anywhere]">
                @{selectedUser.username}
              </p>
              <div className="mt-3 grid min-w-0 gap-2 text-sm text-neutral-600">
                <p className="min-w-0">
                  User ID: <span className="break-all font-mono">{selectedUser.id}</span>
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

            <section className="min-w-0 overflow-hidden rounded-3xl border border-neutral-200 bg-white p-5">
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

            <section className="min-w-0 overflow-hidden rounded-3xl border border-neutral-200 bg-white p-5">
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
                      className="min-w-0 overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold shadow-sm ${badge.className}`}
                          title={badge.description}
                        >
                          <span aria-hidden="true">{badge.icon}</span>
                          <span>{badge.label}</span>
                        </span>
                        <span className="min-w-0 break-words text-xs font-bold uppercase tracking-[0.16em] text-neutral-400 [overflow-wrap:anywhere]">
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

  const moderationTab = moderationReady ? (
    <AdminModerationPanel
      initialItems={moderationItems}
      selectedCaseKey={selectedCaseKey || null}
    />
  ) : (
    <section className="min-w-0 overflow-hidden rounded-[32px] border border-neutral-200 bg-[#fffdf8] p-5 shadow-sm sm:p-6">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">
        Moderation
      </p>
      <h2 className="mt-2 text-2xl font-black tracking-tight text-neutral-950">
        Queue unavailable
      </h2>
      <div className="mt-6 rounded-2xl border border-dashed border-amber-200 bg-amber-50 px-4 py-5 text-sm text-amber-900">
        {moderationUnavailableReason}
      </div>
    </section>
  );

  const badgesTab = (
    <section className="min-w-0 overflow-hidden rounded-[32px] border border-neutral-200 bg-[#fffdf8] p-5 shadow-sm sm:p-6">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">
        Definitions
      </p>
      <h2 className="mt-2 text-2xl font-black tracking-tight text-neutral-950">
        Badge Definitions
      </h2>

      <div className="mt-5 -mx-2 overflow-x-auto px-2">
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

  const overviewCards = [
    {
      href: "/admin?tab=moderation",
      label: "Moderation",
      value: openModerationItemsCount,
      detail: `${archivedModerationItemsCount} archived`,
    },
    {
      href: "/admin?tab=users",
      label: "Users",
      value: users.length,
      detail: "Search and badges",
    },
    {
      href: "/admin?tab=badges",
      label: "Badges",
      value: badgeDefinitions.length,
      detail: "Definitions",
    },
  ];

  if (!hasWorkspace) {
    return (
      <main className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-3 overflow-x-hidden px-4 pb-36 pt-3 sm:px-6 sm:pt-4 lg:px-8">
        <section className="rounded-3xl border border-neutral-200 bg-[#fffdf8] px-4 py-4 shadow-sm sm:px-5">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-400">
            Admin
          </p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-neutral-950 sm:text-3xl">
                Control Panel
              </h1>
              <p className="mt-1 text-sm font-medium text-neutral-500">
                Pick a workspace.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-black text-red-700">
                {openModerationItemsCount} open
              </span>
              <span className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-black text-neutral-600">
                {users.length} users
              </span>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          {overviewCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="motion-card rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-neutral-300 hover:bg-neutral-50"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-400">
                {card.label}
              </p>
              <p className="mt-3 text-3xl font-black text-neutral-950">
                {card.value}
              </p>
              <p className="mt-1 text-sm font-medium text-neutral-500">
                {card.detail}
              </p>
            </Link>
          ))}
        </section>
      </main>
    );
  }

  const showCompactHeader = initialTab !== "moderation";

  return (
    <main className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-3 overflow-x-hidden px-4 pb-36 pt-3 sm:px-6 sm:pt-4 lg:gap-3 lg:px-8 lg:pt-4">
        {showCompactHeader && (
        <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-[#fffdf8] px-4 py-3 shadow-sm sm:px-5 sm:py-4">
          <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-400">
                Admin
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-neutral-950 sm:text-3xl">
                Control Panel
              </h1>
              <p className="mt-1 max-w-3xl break-words text-xs font-medium text-neutral-500 sm:text-sm">
                A clear surface for moderation, user diagnostics, and badge
                management using the existing server helpers.
              </p>
            </div>
            <div className="grid min-w-0 shrink-0 grid-cols-3 gap-1.5 rounded-2xl border border-neutral-200 bg-white/80 p-1.5 text-center shadow-sm">
              <div className="px-3 py-1.5">
                <p className="text-base font-black tabular-nums text-neutral-950">
                  {users.length}
                </p>
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-neutral-500">
                  Users
                </p>
              </div>
              <div className="border-l border-neutral-100 px-3 py-1.5">
                <p className="text-base font-black tabular-nums text-red-700">
                  {openModerationItemsCount}
                </p>
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-neutral-500">
                  Open
                </p>
              </div>
              <div className="border-l border-neutral-100 px-3 py-1.5">
                <p className="text-base font-black tabular-nums text-neutral-950">
                  {archivedModerationItemsCount}
                </p>
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-neutral-500">
                  Archived
                </p>
              </div>
            </div>
          </div>
        </section>
        )}

        {initialTab === "moderation" ? (
          moderationTab
        ) : (
          <AdminTabs
            initialTab={initialTab}
            tabs={[
              {
                id: "moderation",
                label: `Moderation (${openModerationItemsCount})`,
                content: moderationTab,
              },
              { id: "users", label: "Users", content: usersTab },
              { id: "badges", label: "Badges", content: badgesTab },
            ]}
          />
        )}
    </main>
  );
}


