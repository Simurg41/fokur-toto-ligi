"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

type ProfileFormProps = {
  userId: string;
  initialDisplayName: string | null;
};

export function ProfileForm({ userId, initialDisplayName }: ProfileFormProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialDisplayName ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    setError(null);

    const supabase = createClient();
    const trimmedDisplayName = displayName.trim();
    const savedDisplayName = trimmedDisplayName.length > 0 ? trimmedDisplayName : null;

    const { data: updatedProfile, error: updateError } = await supabase
      .from("profiles")
      .update({ display_name: savedDisplayName })
      .eq("id", userId)
      .select("display_name")
      .maybeSingle();

    if (updateError) {
      setError("Profil güncellenemedi. Lütfen tekrar deneyin.");
      setIsSaving(false);
      return;
    }

    if (!updatedProfile) {
      const { data: insertedProfile, error: upsertError } = await supabase
        .from("profiles")
        .upsert({ id: userId, display_name: savedDisplayName }, { onConflict: "id" })
        .select("display_name")
        .maybeSingle();

      if (upsertError) {
        setError("Profil oluşturulamadı. Lütfen tekrar deneyin.");
        setIsSaving(false);
        return;
      }

      setDisplayName(insertedProfile?.display_name ?? "");
    } else {
      setDisplayName(updatedProfile.display_name ?? "");
    }

    setMessage("Profil güncellendi.");
    setIsSaving(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3">
      <div className="space-y-1.5">
        <label htmlFor="display-name" className="text-sm font-semibold text-slate-700">
          Görünen ad
        </label>
        <input
          id="display-name"
          name="display_name"
          type="text"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          placeholder="Adını yaz"
          autoComplete="name"
        />
      </div>

      {message ? <p className="text-sm font-semibold text-teal-700">{message}</p> : null}
      {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={isSaving}
        className="h-11 w-full rounded-md bg-teal-700 px-4 text-sm font-bold text-white transition hover:bg-teal-800 disabled:opacity-60"
      >
        {isSaving ? "Kaydediliyor..." : "Profili Kaydet"}
      </button>
    </form>
  );
}
