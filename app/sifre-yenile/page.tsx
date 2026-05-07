"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

export default function PasswordResetPage() {
  const [password, setPassword] = useState("");
  const [passwordAgain, setPasswordAgain] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function exchangeRecoveryCode() {
      const code = new URLSearchParams(window.location.search).get("code");

      if (!code) {
        return;
      }

      const supabase = createClient();
      await supabase.auth.exchangeCodeForSession(code);
    }

    exchangeRecoveryCode();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setIsSuccess(false);

    if (password.length < 6) {
      setError("Yeni şifre en az 6 karakter olmalı.");
      return;
    }

    if (password !== passwordAgain) {
      setError("Şifreler eşleşmiyor.");
      return;
    }

    setIsLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setIsLoading(false);

    if (updateError) {
      setError("Şifre yenileme oturumu bulunamadı. Lütfen tekrar sıfırlama bağlantısı iste.");
      return;
    }

    setPassword("");
    setPasswordAgain("");
    setIsSuccess(true);
    setMessage("Şifren güncellendi. Giriş sayfasına dönebilirsin.");
  }

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <p className="text-sm font-semibold text-teal-700">Şifre yenile</p>
        <h1 className="text-2xl font-bold text-slate-950">Yeni şifreni belirle</h1>
        <p className="text-sm leading-6 text-slate-600">
          E-postana gelen bağlantıya tıkladıktan sonra yeni şifreni burada belirleyebilirsin.
        </p>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Yeni şifre</span>
            <div className="relative mt-2">
              <input
                type={showPasswords ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="h-12 w-full rounded-md border border-slate-200 bg-white px-3 pr-20 text-base text-slate-950 outline-none focus:border-teal-600"
              />
              <button
                type="button"
                onClick={() => setShowPasswords((current) => !current)}
                aria-label={showPasswords ? "Şifreyi gizle" : "Şifreyi göster"}
                className="absolute inset-y-1 right-1 rounded-md px-3 text-sm font-bold text-teal-700"
              >
                {showPasswords ? "Gizle" : "Göster"}
              </button>
            </div>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Yeni şifre tekrar</span>
            <div className="relative mt-2">
              <input
                type={showPasswords ? "text" : "password"}
                value={passwordAgain}
                onChange={(event) => setPasswordAgain(event.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="h-12 w-full rounded-md border border-slate-200 bg-white px-3 pr-20 text-base text-slate-950 outline-none focus:border-teal-600"
              />
              <button
                type="button"
                onClick={() => setShowPasswords((current) => !current)}
                aria-label={showPasswords ? "Şifreyi gizle" : "Şifreyi göster"}
                className="absolute inset-y-1 right-1 rounded-md px-3 text-sm font-bold text-teal-700"
              >
                {showPasswords ? "Gizle" : "Göster"}
              </button>
            </div>
          </label>

          {message ? (
            <p className="rounded-md bg-teal-50 px-3 py-2 text-sm text-teal-800">{message}</p>
          ) : null}
          {error ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={isLoading || isSuccess}
            className="h-12 w-full rounded-md bg-teal-700 px-4 text-sm font-bold text-white shadow-sm disabled:opacity-60"
          >
            {isLoading ? "Güncelleniyor..." : "Şifreyi Güncelle"}
          </button>

          {isSuccess ? (
            <Link
              href="/giris"
              className="flex h-12 w-full items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700"
            >
              Giriş sayfasına dön
            </Link>
          ) : null}
        </form>
      </section>
    </div>
  );
}
