import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "./profile-form";

export const dynamic = "force-dynamic";

export default async function ProfileSettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("username, bio, avatar_url, is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <main className="mx-auto max-w-2xl px-4 pb-28 pt-6 sm:px-6 sm:pt-10 lg:pt-14">
        <section className="relative mb-6 overflow-hidden rounded-[32px] bg-neutral-950 px-5 py-8 text-white shadow-2xl sm:mb-8 sm:rounded-[40px] sm:px-8 sm:py-12 lg:px-12">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute right-0 top-0 h-full w-full bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_50%)]" />
            <div className="absolute left-0 bottom-0 h-full w-full bg-[radial-gradient(circle_at_bottom_left,rgba(245,158,11,0.05),transparent_40%)]" />
          </div>

          <div className="relative">
            <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/60">
              Identity Management
            </span>
            <h1 className="mt-5 text-4xl font-black tracking-tighter sm:mt-6 sm:text-5xl">
              Refine your <span className="text-glow-neutral text-neutral-400">Presence.</span>
            </h1>
            <p className="mt-4 max-w-md text-sm font-medium leading-relaxed text-neutral-400">
              Your identity is your legacy in the Arena. Update your bio, choose your avatar, and stay recognizable among Legends.
            </p>
          </div>
        </section>

        <div className="rounded-[32px] border border-neutral-200 bg-white p-5 shadow-sm sm:p-8 lg:p-10">
          <div className="mb-6 border-b border-neutral-100 pb-5 sm:mb-8 sm:pb-6">
            <h2 className="text-xl font-black tracking-tight text-neutral-950">Profile Essence</h2>
            <p className="mt-1 text-sm font-medium text-neutral-500">How the community perceives your contributions.</p>
          </div>

          <ProfileForm
            initialUsername={profile?.username ?? ""}
            initialBio={profile?.bio ?? ""}
            initialAvatarUrl={profile?.avatar_url ?? ""}
          />
        </div>

        <section className="mt-6 rounded-[32px] border border-dashed border-neutral-300 p-6 text-center sm:mt-8 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">
            Professional Tip
          </p>
          <p className="mt-2 text-sm font-medium text-neutral-500">
            Strong contributors with a clear bio often see higher engagement on their thoughts.
          </p>
        </section>
      </main>
    </div>
  );
}

