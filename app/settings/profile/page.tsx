import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "./profile-form";
import DeleteAccountForm from "./delete-account-form";

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
      <main className="mx-auto max-w-xl px-4 pb-32 pt-4 sm:px-6 sm:pt-6 lg:pt-8">
        <div className="rounded-[28px] border border-neutral-100 bg-white p-4 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.42)] sm:p-6">
          <div className="mb-4 border-b border-neutral-100 pb-3 sm:mb-5 sm:pb-4">
            <h1 className="text-xl font-black tracking-tight text-neutral-950 sm:text-2xl">
              Profile settings
            </h1>
            <p className="mt-1 text-xs font-medium text-neutral-500 sm:text-sm">
              Update avatar, username, and bio.
            </p>
          </div>

          <ProfileForm
            initialUsername={profile?.username ?? ""}
            initialBio={profile?.bio ?? ""}
            initialAvatarUrl={profile?.avatar_url ?? ""}
          />
        </div>

        <section className="mt-4 rounded-[28px] border border-red-100 bg-red-50/50 p-4 shadow-sm sm:mt-5 sm:p-5">
          <p className="text-xs font-black uppercase tracking-widest text-red-500">
            Danger Zone
          </p>
          <h2 className="mt-1.5 text-lg font-black tracking-tight text-neutral-950 sm:text-xl">
            Delete account
          </h2>
          <p className="mt-1.5 text-sm font-medium leading-6 text-neutral-600">
            This permanently removes your account and personal profile data.
            Hall of Fame snapshots are kept as historical records and anonymized.
          </p>
          <div className="mt-4">
            <DeleteAccountForm />
          </div>
        </section>
      </main>
    </div>
  );
}

