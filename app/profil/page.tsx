import { LogoutButton } from "@/components/logout-button";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="space-y-4">
      <header>
        <p className="text-sm font-semibold text-teal-700">Profil</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-950">Misafir profil</h1>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 text-lg font-bold text-teal-800">
            ST
          </div>
          <div>
            <p className="font-bold text-slate-950">Spor Toto Tahmin</p>
            <p className="text-sm text-slate-500">
              {user?.email ? `${user.email} ile giriş yapıldı.` : "Giriş bilgisi bulunamadı."}
            </p>
          </div>
        </div>
        <LogoutButton />
      </section>
    </div>
  );
}
