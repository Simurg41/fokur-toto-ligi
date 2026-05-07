import { Suspense } from "react";
import { LoginForm } from "@/app/giris/login-form";

export default function LoginPage() {
  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <p className="text-sm font-semibold text-teal-700">Giris</p>
        <h1 className="text-2xl font-bold text-slate-950">Arkadas grubuna katil</h1>
        <p className="text-sm leading-6 text-slate-600">
          Tahminleri gormek ve kuponunu kaydetmek icin e-posta ile giris yap.
        </p>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <Suspense fallback={<p className="text-sm text-slate-600">Yukleniyor...</p>}>
          <LoginForm />
        </Suspense>
      </section>
    </div>
  );
}
