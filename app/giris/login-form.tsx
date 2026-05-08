"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

type View = "login" | "reset";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

    const result = await supabase.auth.signInWithPassword({ email, password });

    setIsLoading(false);

    if (result.error) {
      setMessage(result.error.message);
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
      ) : null}

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
          <span className="text-sm font-semibold text-slate-700">Şifre</span>
          <div className="relative mt-2">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              autoComplete="current-password"
              className="h-12 w-full rounded-md border border-slate-200 bg-white px-3 pr-20 text-base text-slate-950 outline-none focus:border-teal-600"
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
              className="absolute inset-y-1 right-1 rounded-md px-3 text-sm font-bold text-teal-700"
            >
              {showPassword ? "Gizle" : "Göster"}
            </button>
          </div>
        </label>
      ) : null}

      {view === "login" ? (
        <p className="rounded-md bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-600">
          Bu lig davetlidir. Hesaplar yönetici tarafından oluşturulur.
        </p>
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
          ? "İşleniyor..."
          : view === "reset"
            ? "Şifre sıfırlama bağlantısı gönder"
            : "Giriş yap"}
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
