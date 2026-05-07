"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

type Mode = "login" | "register";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const nextPath = searchParams.get("next") || "/tahminler";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");

    const supabase = createClient();
    const result =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setIsLoading(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    if (mode === "register" && !result.data.session) {
      setMessage("Kayit tamamlandi. E-posta dogrulamasi gerekiyorsa gelen kutunu kontrol et.");
      return;
    }

    router.push(nextPath);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`h-10 rounded-md text-sm font-bold ${
            mode === "login" ? "bg-white text-teal-800 shadow-sm" : "text-slate-600"
          }`}
        >
          Giris
        </button>
        <button
          type="button"
          onClick={() => setMode("register")}
          className={`h-10 rounded-md text-sm font-bold ${
            mode === "register" ? "bg-white text-teal-800 shadow-sm" : "text-slate-600"
          }`}
        >
          Kayit
        </button>
      </div>

      <label className="block">
        <span className="text-sm font-semibold text-slate-700">E-posta</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          autoComplete="email"
          className="mt-2 h-12 w-full rounded-md border border-slate-200 bg-white px-3 text-base text-slate-950 outline-none focus:border-teal-600"
        />
      </label>

      <label className="block">
        <span className="text-sm font-semibold text-slate-700">Sifre</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={6}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          className="mt-2 h-12 w-full rounded-md border border-slate-200 bg-white px-3 text-base text-slate-950 outline-none focus:border-teal-600"
        />
      </label>

      {message ? (
        <p className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">{message}</p>
      ) : null}

      <button
        type="submit"
        disabled={isLoading}
        className="h-12 w-full rounded-md bg-teal-700 px-4 text-sm font-bold text-white shadow-sm disabled:opacity-60"
      >
        {isLoading ? "Isleniyor..." : mode === "login" ? "Giris yap" : "Kayit ol"}
      </button>
    </form>
  );
}
