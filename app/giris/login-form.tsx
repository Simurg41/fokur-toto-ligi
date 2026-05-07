"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

type Mode = "login" | "register";
type View = Mode | "reset";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const nextPath = searchParams.get("next") || "/tahminler";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");
    setIsSuccess(false);

    const supabase = createClient();

    if (view === "reset") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/sifre-yenile`,
      });

      setIsLoading(false);

      if (error) {
        setMessage("Şifre sıfırlama bağlantısı gönderilemedi. Lütfen tekrar deneyin.");
        return;
      }

      setIsSuccess(true);
      setMessage("Şifre sıfırlama bağlantısı e-posta adresine gönderildi.");
      return;
    }

    const result =
      view === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setIsLoading(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    if (view === "register" && !result.data.session) {
      setMessage("Kayit tamamlandi. E-posta dogrulamasi gerekiyorsa gelen kutunu kontrol et.");
      return;
    }

    router.push(nextPath);
    router.refresh();
  }

  function switchView(nextView: View) {
    setView(nextView);
    setMessage("");
    setIsSuccess(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {view === "reset" ? (
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-slate-950">Şifre sıfırlama</h2>
          <p className="text-sm leading-6 text-slate-600">
            E-posta adresini yaz, şifreni yenilemen için bağlantı gönderelim.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => switchView("login")}
            className={`h-10 rounded-md text-sm font-bold ${
              view === "login" ? "bg-white text-teal-800 shadow-sm" : "text-slate-600"
            }`}
          >
            Giris
          </button>
          <button
            type="button"
            onClick={() => switchView("register")}
            className={`h-10 rounded-md text-sm font-bold ${
              view === "register" ? "bg-white text-teal-800 shadow-sm" : "text-slate-600"
            }`}
          >
            Kayit
          </button>
        </div>
      )}

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

      {view !== "reset" ? (
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Sifre</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
            autoComplete={view === "login" ? "current-password" : "new-password"}
            className="mt-2 h-12 w-full rounded-md border border-slate-200 bg-white px-3 text-base text-slate-950 outline-none focus:border-teal-600"
          />
        </label>
      ) : null}

      {message ? (
        <p
          className={`rounded-md px-3 py-2 text-sm ${
            isSuccess ? "bg-teal-50 text-teal-800" : "bg-slate-100 text-slate-700"
          }`}
        >
          {message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isLoading}
        className="h-12 w-full rounded-md bg-teal-700 px-4 text-sm font-bold text-white shadow-sm disabled:opacity-60"
      >
        {isLoading
          ? "Isleniyor..."
          : view === "reset"
            ? "Şifre sıfırlama bağlantısı gönder"
            : view === "login"
              ? "Giris yap"
              : "Kayit ol"}
      </button>

      {view === "reset" ? (
        <button
          type="button"
          onClick={() => switchView("login")}
          className="w-full text-center text-sm font-bold text-teal-700"
        >
          Giriş ekranına dön
        </button>
      ) : (
        <button
          type="button"
          onClick={() => switchView("reset")}
          className="w-full text-center text-sm font-bold text-slate-600"
        >
          Şifremi unuttum
        </button>
      )}
    </form>
  );
}
