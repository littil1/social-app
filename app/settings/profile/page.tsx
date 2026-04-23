import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NavBar from "@/shared/components/layout/navbar";
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

  const navUser = {
    username: profile?.username ?? "user",
    avatar_url: profile?.avatar_url ?? null,
    is_admin: profile?.is_admin ?? false,
  };

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <NavBar user={navUser} />

      <main className="mx-auto max-w-2xl px-4 py-8 sm:py-16">
        <section className="relative mb-8 overflow-hidden rounded-[40px] bg-neutral-950 px-8 py-12 text-white shadow-2xl lg:px-12">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute right-0 top-0 h-full w-full bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_50%)]" />
            <div className="absolute left-0 bottom-0 h-full w-full bg-[radial-gradient(circle_at_bottom_left,rgba(245,158,11,0.05),transparent_40%)]" />
          </div>

          <div className="relative">
            <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/60">
              Identity Management
            </span>
            <h1 className="mt-6 text-4xl font-black tracking-tighter sm:text-5xl">
              Refine your <span className="text-glow-neutral text-neutral-400">Presence.</span>
            </h1>
            <p className="mt-4 max-w-md text-sm font-medium leading-relaxed text-neutral-400">
              Your identity is your legacy in the Arena. Update your bio, choose your avatar, and stay recognizable among Legends.
            </p>
          </div>
        </section>

        <div className="rounded-[32px] border border-neutral-200 bg-white p-6 shadow-sm sm:p-10">
          <div className="mb-8 border-b border-neutral-100 pb-6">
            <h2 className="text-xl font-black tracking-tight text-neutral-950">Profile Essence</h2>
            <p className="mt-1 text-sm font-medium text-neutral-500">How the community perceives your contributions.</p>
          </div>

          <ProfileForm
            initialUsername={profile?.username ?? ""}
            initialBio={profile?.bio ?? ""}
            initialAvatarUrl={profile?.avatar_url ?? ""}
          />
        </div>

        <section className="mt-8 rounded-[32px] border border-dashed border-neutral-300 p-8 text-center">
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

