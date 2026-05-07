"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";

export function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogout() {
    setIsLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/giris");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoading}
      className="mt-4 h-11 w-full rounded-md border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 disabled:opacity-60"
    >
      {isLoading ? "Cikis yapiliyor..." : "Cikis yap"}
    </button>
  );
}
