import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import NavBar from "@/app/navbar";
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, bio, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <>
      <NavBar />

      <main className="mx-auto max-w-xl p-6">
        <h1 className="mb-6 text-3xl font-bold">Profile Settings</h1>

        <div className="rounded-xl bg-white p-6 shadow">
          <ProfileForm
            initialUsername={profile?.username ?? ""}
            initialBio={profile?.bio ?? ""}
            initialAvatarUrl={profile?.avatar_url ?? ""}
          />
        </div>
      </main>
    </>
  );
}