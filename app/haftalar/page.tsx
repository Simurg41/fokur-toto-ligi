import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Season = {
  id: string;
  name: string;
};

type Week = {
  id: string;
  name: string | null;
  week_number: number;
  opens_at: string;
  closes_at: string;
};

type MatchResult = {
  week_id: string;
  official_result: string | null;
};

type WeeklyScore = {
  week_id: string;
  points: number;
};

export const dynamic = "force-dynamic";

export default async function WeeksArchivePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/giris?next=/haftalar");
  }

  const { data: seasonData } = await supabase
    .from("seasons")
    .select("id, name")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  const season = seasonData as Season | null;

  if (!season) {
    return (
      <ArchiveShell>
        <EmptyState text="Henüz hafta bulunamadı." />
      </ArchiveShell>
    );
  }

  const { data: weekData } = await supabase
    .from("weeks")
    .select("id, name, week_number, opens_at, closes_at")
    .eq("season_id", season.id)
    .order("week_number", { ascending: false });
  const weeks = (weekData || []) as Week[];

  if (weeks.length === 0) {
    return (
      <ArchiveShell>
        <EmptyState text="Henüz hafta bulunamadı." />
      </ArchiveShell>
    );
  }

  const weekIds = weeks.map((week) => week.id);
  const [{ data: matchData }, { data: scoreData }] = await Promise.all([
    supabase.from("matches").select("week_id, official_result").in("week_id", weekIds),
    supabase
      .from("weekly_scores")
      .select("week_id, points")
      .eq("user_id", user.id)
      .in("week_id", weekIds),
  ]);
  const matches = (matchData || []) as MatchResult[];
  const scores = (scoreData || []) as WeeklyScore[];
  const resultCountByWeek = matches.reduce<Record<string, number>>((current, match) => {
    if (match.official_result) {
      current[match.week_id] = (current[match.week_id] || 0) + 1;
    }

    return current;
  }, {});
  const scoreByWeek = new Map(scores.map((score) => [score.week_id, score]));
  const now = new Date();

  return (
    <ArchiveShell>
      <div className="space-y-3">
        {weeks.map((week) => {
          const status = getWeekStatus(week, resultCountByWeek[week.id] || 0, now);
          const score = scoreByWeek.get(week.id);

          return (
            <article
              key={week.id}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-normal text-slate-400">
                    {week.week_number}. hafta
                  </p>
                  <h2 className="mt-1 truncate text-lg font-bold text-slate-950">
                    {week.name || `${week.week_number}. hafta`}
                  </h2>
                </div>
                <StatusBadge status={status} />
              </div>

              <div className="mt-4 grid gap-2 text-sm text-slate-600">
                <p>Açılış: {formatDate(week.opens_at)}</p>
                <p>Kapanış: {formatDate(week.closes_at)}</p>
                <p className="font-bold text-teal-700">
                  {score ? `${score.points} puan` : "Puanlar henüz hesaplanmadı."}
                </p>
              </div>

              <Link
                href={`/haftalar/${week.id}`}
                className="mt-4 flex h-11 w-full items-center justify-center rounded-md bg-teal-700 px-4 text-sm font-bold text-white shadow-sm"
              >
                Haftayı Gör
              </Link>
            </article>
          );
        })}
      </div>
    </ArchiveShell>
  );
}

function ArchiveShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <header>
        <p className="text-sm font-semibold text-teal-700">Haftalar</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-950">Geçmiş haftalar</h1>
      </header>
      {children}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm leading-6 text-slate-600">{text}</p>
    </section>
  );
}

function StatusBadge({ status }: { status: "Açık" | "Kapandı" | "Sonuçlandı" }) {
  const styles = {
    Açık: "bg-teal-100 text-teal-800",
    Kapandı: "bg-amber-100 text-amber-800",
    Sonuçlandı: "bg-slate-100 text-slate-700",
  };

  return (
    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${styles[status]}`}>
      {status}
    </span>
  );
}

function getWeekStatus(week: Week, resultCount: number, now: Date) {
  if (now < new Date(week.closes_at)) {
    return "Açık" as const;
  }

  if (resultCount >= 15) {
    return "Sonuçlandı" as const;
  }

  return "Kapandı" as const;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
