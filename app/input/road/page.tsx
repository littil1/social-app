import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type RoadItem = {
  id: string;
  status: string;
  title: string;
  description: string;
  dateLabel?: string;
  icon?: string;
  fromInput?: boolean;
  imageUrl?: string;
  achievementId?: string;
  sourceFeatureRequestId?: number | null;
  sourceUserUsernameSnapshot?: string | null;
  isDynamic?: boolean;
};

const staticRoadItems: RoadItem[] = [
  {
    id: "built-with-you",
    status: "COMMUNITY",
    title: "Built with you begins",
    description:
      "This road now shows what changed and what was shaped through INPUT.",
    dateLabel: "March 2026",
    icon: "🛣️",
    fromInput: true,
  },
  {
    id: "vibe-system",
    status: "IMPROVED",
    title: "VIBE explains the system",
    description:
      "A dedicated page now explains ECHO, BOOST and how APP works.",
    dateLabel: "March 2026",
    icon: "🌌",
  },
  {
    id: "input-loop",
    status: "COMMUNITY",
    title: "INPUT opened the feedback loop",
    description:
      "People can suggest, support and discuss what APP should become next.",
    dateLabel: "April 2026",
    icon: "💡",
    fromInput: true,
  },
  {
    id: "safer-foundations",
    status: "SAFETY",
    title: "Safer foundations",
    description:
      "Reports, rate limits, account deletion and clearer errors make APP more reliable before wider launch.",
    dateLabel: "April 2026",
    icon: "🛡️",
  },
  {
    id: "daily-boost",
    status: "LIVE",
    title: "Daily BOOST launched",
    description:
      "Every day, each user gets one 🚀 BOOST to lift the post they believe deserves more visibility.",
    dateLabel: "May 2026",
    icon: "🚀",
  },
  {
    id: "profiles-identities",
    status: "IMPROVED",
    title: "Profiles became identities",
    description:
      "Profiles now show ECHO, posts, ideas, followers and achievements with a more premium identity layer.",
    dateLabel: "May 2026",
    icon: "✨",
  },
  {
    id: "legends-snapshots",
    status: "DEPLOYED",
    title: "LEGENDS preserves daily winners",
    description:
      "The strongest post of each day is saved as a lasting snapshot.",
    dateLabel: "May 2026",
    icon: "👑",
  },
  {
    id: "live-daily-race",
    status: "LIVE",
    title: "LIVE became the daily race",
    description:
      "The leaderboard now focuses on today's momentum, with ECHO deciding what rises.",
    dateLabel: "May 2026",
    icon: "🔥",
  },
];

function getStatusClass(status: string) {
  if (status === "LIVE") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "SAFETY") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  if (status === "COMMUNITY") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-neutral-200 bg-neutral-50 text-neutral-600";
}

function getMonthLabel(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
    timeZone: "Europe/Zurich",
  }).format(new Date(value));
}

function getInspiredByLabel(username: string | null | undefined) {
  if (!username) return "the community";
  if (username === "deleted user") return "deleted user";
  return `@${username}`;
}

async function getPublishedRoadAchievements(): Promise<RoadItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("road_achievements")
    .select(
      "id, source_feature_request_id, title, description, status, icon, image_url, source_user_username_snapshot, implemented_at, sort_order"
    )
    .eq("is_published", true);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? [])
    .sort((a, b) => {
      if (a.sort_order !== null && b.sort_order !== null) {
        return a.sort_order - b.sort_order;
      }

      if (a.sort_order !== null) return -1;
      if (b.sort_order !== null) return 1;

      return (
        new Date(a.implemented_at).getTime() -
        new Date(b.implemented_at).getTime()
      );
    })
    .map((achievement) => ({
      id: `road-achievement-${achievement.id}`,
      achievementId: achievement.id,
      status: achievement.status,
      title: achievement.title,
      description: achievement.description,
      dateLabel: getMonthLabel(achievement.implemented_at),
      icon: achievement.icon ?? "✨",
      imageUrl: achievement.image_url ?? undefined,
      fromInput: true,
      sourceFeatureRequestId: achievement.source_feature_request_id,
      sourceUserUsernameSnapshot:
        achievement.source_user_username_snapshot,
      isDynamic: true,
    }));
}

export default async function InputRoadPage() {
  const roadItems = [
    ...staticRoadItems,
    ...(await getPublishedRoadAchievements()),
  ];

  return (
    <main className="min-h-screen bg-[#fafafa]">
      <div className="mx-auto max-w-6xl px-4 pb-32 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pt-12">
        <section className="relative overflow-hidden rounded-[36px] bg-neutral-950 px-5 py-8 text-white shadow-[0_34px_90px_-34px_rgba(0,0,0,0.55)] sm:px-8 sm:py-10 lg:px-12 lg:py-12">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-amber-400/10 blur-[110px]" />
            <div className="absolute bottom-0 left-0 h-52 w-52 rounded-full bg-white/5 blur-[90px]" />
          </div>

          <div className="relative max-w-3xl">
            <Link
              href="/input"
              className="inline-flex rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/70 transition hover:bg-white/10"
            >
              INPUT
            </Link>
            <h1 className="mt-6 text-4xl font-black tracking-tighter sm:text-6xl lg:text-7xl">
              Built with you
            </h1>
            <p className="mt-5 max-w-2xl text-base font-medium leading-relaxed text-neutral-400 sm:text-lg">
              APP grows through the ideas people bring to INPUT.
            </p>
            <p className="mt-4 max-w-2xl text-sm font-bold leading-6 text-neutral-500 sm:text-base">
              Idea to discussion. Discussion to deployed. Deployed to Road achievement.
            </p>
          </div>
        </section>

        <section className="relative mt-10 sm:mt-14">
          <div className="absolute bottom-0 left-4 top-8 hidden w-px bg-gradient-to-b from-amber-200 via-neutral-200 to-amber-200 md:left-1/2 md:block" />

          <div className="space-y-5 sm:space-y-7">
            {roadItems.map((item, index) => {
              const isRight = index % 2 === 1;

              return (
                <article
                  key={item.id}
                  id={item.achievementId ? `road-achievement-${item.achievementId}` : item.id}
                  className={`relative grid gap-4 md:grid-cols-2 md:gap-8 ${
                    isRight ? "md:[&>*]:col-start-2" : ""
                  }`}
                >
                  <div className="absolute left-4 top-8 hidden h-5 w-5 -translate-x-1/2 rounded-full border border-amber-200 bg-amber-50 shadow-[0_0_0_5px_rgba(250,250,250,0.95)] md:left-1/2 md:block" />
                  <div className="rounded-[30px] border border-neutral-200 bg-white/85 p-5 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.35)] backdrop-blur sm:p-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${getStatusClass(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>
                      {item.fromInput && (
                        <span className="rounded-full border border-amber-100 bg-amber-50/70 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">
                          From INPUT
                        </span>
                      )}
                      {item.dateLabel && (
                        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-400">
                          {item.dateLabel}
                        </span>
                      )}
                    </div>

                    <div className="mt-5 flex gap-4">
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-neutral-100 bg-neutral-50 text-2xl">
                        {item.icon ?? "•"}
                      </span>
                      <div>
                        <h2 className="text-xl font-black tracking-tight text-neutral-950 sm:text-2xl">
                          {item.title}
                        </h2>
                        <p className="mt-2 text-sm font-medium leading-6 text-neutral-600 sm:text-base">
                          {item.description}
                        </p>
                        {item.isDynamic && (
                          <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-neutral-400">
                            <span>
                              Inspired by{" "}
                              {getInspiredByLabel(
                                item.sourceUserUsernameSnapshot
                              )}
                            </span>
                            {item.sourceFeatureRequestId && (
                              <Link
                                href={`/input#input-idea-${item.sourceFeatureRequestId}`}
                                className="text-amber-700 transition hover:text-amber-800"
                              >
                                View original idea
                              </Link>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="relative mt-7 rounded-[34px] border border-amber-200/80 bg-white p-6 text-center shadow-[0_28px_80px_-56px_rgba(245,158,11,0.55)] sm:mt-9 sm:p-10">
          <div className="absolute left-1/2 top-0 hidden h-9 w-px -translate-y-full bg-amber-200 md:block" />
          <div className="absolute left-1/2 top-0 hidden h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-200 bg-amber-50 shadow-[0_0_0_5px_rgba(250,250,250,0.95)] md:block" />
          <h2 className="text-3xl font-black tracking-tight text-neutral-950 sm:text-4xl">
            Help shape what comes next.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base font-medium leading-relaxed text-neutral-600">
            Have an idea for APP? Bring it to INPUT and help decide the next step.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/input"
              className="rounded-full bg-neutral-950 px-7 py-3.5 text-sm font-black text-white shadow-lg transition hover:scale-105"
            >
              Suggest the next step
            </Link>
            <Link
              href="/vibe"
              className="rounded-full border border-neutral-200 bg-white px-7 py-3.5 text-sm font-black text-neutral-950 transition hover:bg-neutral-50"
            >
              Explore VIBE
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
