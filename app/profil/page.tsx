import { LogoutButton } from "@/components/logout-button";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let displayName: string | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();

    if (profile) {
      displayName = profile.display_name;
    } else {
      const { data: insertedProfile } = await supabase
        .from("profiles")
        .upsert({ id: user.id }, { onConflict: "id" })
        .select("display_name")
        .maybeSingle();

      displayName = insertedProfile?.display_name ?? null;
    }
  }

  const profileTitle = displayName?.trim() || user?.email || "Kullanıcı";

  return (
    <div className="space-y-4">
      <header>
        <p className="text-sm font-semibold text-teal-700">Profil</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-950">Profilim</h1>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 text-lg font-bold text-teal-800">
            FT
          </div>
          <div className="min-w-0">
            <p className="truncate font-bold text-slate-950">{profileTitle}</p>
            <p className="truncate text-sm text-slate-500">
              {user?.email ? `${user.email} ile giriş yapıldı.` : "Giriş bilgisi bulunamadı."}
            </p>
          </div>
        </div>

        {user ? <ProfileForm userId={user.id} initialDisplayName={displayName} /> : null}

        <LogoutButton />
      </section>
    </div>
  );
}
