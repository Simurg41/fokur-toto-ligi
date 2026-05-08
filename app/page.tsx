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

const homeActions = [
  {
    href: "/tahminler",
    icon: "1X2",
    title: "Tahminler",
    description: "Haftanın 15 maçlık kuponunu doldur.",
    tone: "default",
  },
  {
    href: "/sonuclar",
    icon: "✓",
    title: "Sonuçlar",
    description: "Doğru ve yanlış tahminlerini gör.",
    tone: "default",
  },
  {
    href: "/puan-tablosu",
    icon: "#",
    title: "Puan Tablosu",
    description: "Haftalık ve sezon sıralamasını takip et.",
    tone: "default",
  },
  {
    href: "/haftalar",
    icon: "H",
    title: "Geçmiş Haftalar",
    description: "Eski kuponları, sonuçları ve puanları incele.",
    tone: "default",
  },
  {
    href: "/sezon",
    icon: "S",
    title: "Sezon Özeti",
    description: "Liderleri, kazananları ve oyuncu istatistiklerini gör.",
    tone: "highlight",
  },
  {
    href: "/profil",
    icon: "P",
    title: "Profil",
    description: "Görünen adını düzenle ve hesabını yönet.",
    tone: "default",
  },
] as const;

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [weeklyStatus, homeUser] = await Promise.all([loadWeeklyStatus(), loadHomeUser()]);
  const heroCta = homeUser.isLoggedIn
    ? { href: "/tahminler", label: "Tahminlere Git" }
    : { href: "/giris", label: "Giriş Yap" };
  const visibleActions = homeUser.isAdmin
    ? [...homeActions, { href: "/admin", icon: "Y", title: "Admin", description: "Hafta, maç ve sonuç yönetimini aç.", tone: "highlight" as const }]
    : homeActions;

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="overflow-hidden rounded-3xl border border-teal-800 bg-teal-800 p-6 text-white shadow-sm lg:p-8">
          <div className="flex flex-wrap gap-2">
            {["Canlı lig", "Haftalık tahmin", "Puan mücadelesi"].map((pill) => (
              <span key={pill} className="rounded-full bg-white/12 px-3 py-1 text-xs font-bold text-teal-50">
                {pill}
              </span>
            ))}
          </div>
          <h1 className="mt-6 text-4xl font-black tracking-normal lg:text-5xl">Fokur Toto Ligi</h1>
          <p className="mt-3 text-lg font-semibold text-teal-50">
            Arkadaş arası haftalık 1/X/2 tahmin ligi
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-teal-50/90 lg:text-base">
            Kuponunu doldur, sonuçları takip et, haftalık kapışmada yerini koru.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Link
              href={heroCta.href}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-white/25 px-5 text-sm font-black text-white transition hover:bg-white/10"
            >
              {heroCta.label}
            </Link>
            <Link
              href="/puan-tablosu"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-white/25 px-5 text-sm font-black text-white transition hover:bg-white/10"
            >
              Puan Tablosu
            </Link>
          </div>
        </div>

        <WeeklyStatusCard status={weeklyStatus} />
      </section>

      <section className="grid grid-cols-3 gap-2 lg:gap-4">
        <MiniStat value="15" label="Maç" />
        <MiniStat value="1/X/2" label="Tahmin" />
        <MiniStat value="Hafta" label="Ritim" />
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-teal-700">Lig ekranları</p>
          <h2 className="mt-1 text-xl font-bold text-slate-950">Hızlı erişim</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleActions.map((action) => (
            <HomeActionCard key={action.href} {...action} />
          ))}
        </div>
      </section>
    </div>
  );
}

async function loadHomeUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { isLoggedIn: false, isAdmin: false };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return { isLoggedIn: true, isAdmin: profile?.role === "admin" };
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
      <section className="rounded-3xl border border-teal-100 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-teal-700">Bu Haftanın Durumu</p>
        <h2 className="mt-1 text-lg font-bold text-slate-950">
          Tahmin durumunu görmek için giriş yap.
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Kupon ilerlemeni ve haftanın kapanış saatini giriş yaptıktan sonra burada görebilirsin.
        </p>
        <Link
          href="/giris"
          className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-teal-700 px-4 text-sm font-black text-white shadow-sm transition hover:bg-teal-800"
        >
          Giriş Yap
        </Link>
      </section>
    );
  }

  if (status.type === "empty") {
    return (
      <section className="rounded-3xl border border-teal-100 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-teal-700">Bu Haftanın Durumu</p>
        <h2 className="mt-1 text-lg font-bold text-slate-950">{status.text}</h2>
      </section>
    );
  }

  const missingCount = Math.max(status.totalMatches - status.selectedCount, 0);
  const progressPercent = Math.round((status.selectedCount / status.totalMatches) * 100);

  return (
    <section className="rounded-3xl border border-teal-100 bg-gradient-to-br from-white to-teal-50 p-5 shadow-sm">
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
        className="mt-4 flex h-11 w-full items-center justify-center rounded-xl bg-teal-700 px-4 text-sm font-black text-white shadow-sm transition hover:bg-teal-800"
      >
        {status.isClosed ? "Sonuçlara Git" : "Tahminlere Git"}
      </Link>
    </section>
  );
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-center shadow-sm">
      <p className="text-lg font-black text-slate-950">{value}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500">{label}</p>
    </div>
  );
}

function HomeActionCard({
  href,
  icon,
  title,
  description,
  tone,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
  tone: "default" | "highlight";
}) {
  const isHighlight = tone === "highlight";

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 active:scale-[0.99] ${
        isHighlight
          ? "border-teal-200 bg-teal-50 hover:border-teal-400"
          : "border-slate-200 bg-white hover:border-teal-300"
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black ${
          isHighlight ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-700"
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-base font-bold text-slate-950">{title}</span>
        <span className="mt-1 block text-sm leading-5 text-slate-600">{description}</span>
      </span>
    </Link>
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
