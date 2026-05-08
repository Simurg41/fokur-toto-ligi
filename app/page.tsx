import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Week = {
  id: string;
  name: string | null;
  week_number: number;
  closes_at: string;
};

type Match = {
  id: string;
};

type Prediction = {
  match_id: string;
};

type WeeklyStatus =
  | { type: "logged-out" }
  | { type: "empty"; text: string }
  | {
      type: "ready";
      week: Week;
      totalMatches: number;
      selectedCount: number;
      isClosed: boolean;
    };

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const weeklyStatus = await loadWeeklyStatus();

  return (
    <div className="space-y-6">
      <section className="rounded-lg bg-teal-700 p-5 text-white shadow-sm">
        <p className="text-sm font-semibold text-teal-100">Haftanın kuponu</p>
        <h1 className="mt-2 text-3xl font-bold tracking-normal">Fokur Toto Ligi</h1>
        <p className="mt-3 text-sm leading-6 text-teal-50">
          15 maçlık kuponunu seç, sonuçları takip et ve puan tablosunda durumunu gör.
        </p>
        <Link
          href="/tahminler"
          className="mt-5 inline-flex rounded-md bg-white px-4 py-3 text-sm font-bold text-teal-800 shadow-sm"
        >
          Tahmin yap
        </Link>
      </section>

      <WeeklyStatusCard status={weeklyStatus} />

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-slate-950">15</p>
          <p className="mt-1 text-sm text-slate-600">Mac</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-slate-950">0</p>
          <p className="mt-1 text-sm text-slate-600">Canli veri</p>
        </div>
      </section>

      <Link
        href="/haftalar"
        className="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-teal-300"
      >
        <p className="text-sm font-semibold text-teal-700">Geçmiş Haftalar</p>
        <h2 className="mt-1 text-lg font-bold text-slate-950">Eski kuponları ve puanları gör</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Tamamlanan haftalarda tahminlerini, maç sonuçlarını ve haftalık sıralamayı kontrol et.
        </p>
      </Link>

      <Link
        href="/sezon"
        className="block rounded-lg border border-teal-200 bg-teal-50 p-4 shadow-sm transition hover:border-teal-400"
      >
        <p className="text-sm font-semibold text-teal-700">Sezon Özeti</p>
        <h2 className="mt-1 text-lg font-bold text-slate-950">Liderleri ve istatistikleri gör</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Sezon liderini, haftalık kazananları ve oyuncu performanslarını takip et.
        </p>
      </Link>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">Baslangic surumu</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Bu ekranda henüz harici API veya Supabase bağlantısı yok. Tahminler şimdilik cihazdaki
          React state ile çalışır.
        </p>
      </section>
    </div>
  );
}

async function loadWeeklyStatus(): Promise<WeeklyStatus> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { type: "logged-out" };
  }

  const { data: weekData } = await supabase
    .from("weeks")
    .select("id, name, week_number, closes_at, seasons!inner(is_active)")
    .eq("seasons.is_active", true)
    .order("week_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  const week = weekData as Week | null;

  if (!week) {
    return { type: "empty", text: "Henüz aktif hafta bulunamadı." };
  }

  const [{ data: matchData }, { data: predictionData }] = await Promise.all([
    supabase.from("matches").select("id").eq("week_id", week.id),
    supabase
      .from("predictions")
      .select("match_id")
      .eq("week_id", week.id)
      .eq("user_id", user.id),
  ]);
  const matches = (matchData || []) as Match[];
  const predictions = (predictionData || []) as Prediction[];

  if (matches.length === 0) {
    return { type: "empty", text: "Bu hafta için maç listesi henüz eklenmedi." };
  }

  return {
    type: "ready",
    week,
    totalMatches: matches.length,
    selectedCount: predictions.length,
    isClosed: new Date() >= new Date(week.closes_at),
  };
}

function WeeklyStatusCard({ status }: { status: WeeklyStatus }) {
  if (status.type === "logged-out") {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-teal-700">Bu Haftanın Durumu</p>
        <h2 className="mt-1 text-lg font-bold text-slate-950">
          Tahmin durumunu görmek için giriş yap.
        </h2>
        <Link
          href="/giris"
          className="mt-4 inline-flex h-11 items-center justify-center rounded-md bg-teal-700 px-4 text-sm font-bold text-white shadow-sm"
        >
          Giriş Yap
        </Link>
      </section>
    );
  }

  if (status.type === "empty") {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-teal-700">Bu Haftanın Durumu</p>
        <h2 className="mt-1 text-lg font-bold text-slate-950">{status.text}</h2>
      </section>
    );
  }

  const missingCount = Math.max(status.totalMatches - status.selectedCount, 0);
  const progressPercent = Math.round((status.selectedCount / status.totalMatches) * 100);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-teal-700">Bu Haftanın Durumu</p>
          <h2 className="mt-1 truncate text-lg font-bold text-slate-950">
            {status.week.name || `${status.week.week_number}. Hafta`}
          </h2>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
            status.isClosed ? "bg-amber-100 text-amber-800" : "bg-teal-100 text-teal-800"
          }`}
        >
          {status.isClosed ? "Tahmin süresi doldu" : "Tahminler açık"}
        </span>
      </div>

      <p className="mt-3 text-sm text-slate-500">Kapanış: {formatHomeDate(status.week.closes_at)}</p>
      <p className="mt-3 text-base font-bold text-slate-950">
        {status.selectedCount}/{status.totalMatches} tahmin yapıldı
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-teal-700"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <p className={missingCount > 0 ? "mt-3 text-sm font-semibold text-amber-700" : "mt-3 text-sm font-semibold text-teal-700"}>
        {missingCount > 0 ? `${missingCount} maç eksik` : "Tüm tahminler tamamlandı"}
      </p>
      <Link
        href={status.isClosed ? "/sonuclar" : "/tahminler"}
        className="mt-4 flex h-11 w-full items-center justify-center rounded-md bg-teal-700 px-4 text-sm font-bold text-white shadow-sm"
      >
        {status.isClosed ? "Sonuçlara Git" : "Tahminlere Git"}
      </Link>
    </section>
  );
}

function formatHomeDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
