import { createClient } from "@/lib/supabase/server";

type Season = {
  id: string;
  name: string;
};

type Week = {
  id: string;
  name: string | null;
  week_number: number;
};

type WeeklyScore = {
  user_id: string;
  correct_count: number;
  points: number;
};

type SeasonScore = {
  user_id: string;
  points: number;
};

type Profile = {
  id: string;
  display_name: string | null;
};

type LeaderboardRow = {
  userId: string;
  name: string;
  points: number;
  correctCount?: number;
};

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const { data: seasonData } = await supabase
    .from("seasons")
    .select("id, name")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  const season = seasonData as Season | null;

  if (!season) {
    return (
      <LeaderboardShell>
        <EmptyState />
      </LeaderboardShell>
    );
  }

  const { data: weekData } = await supabase
    .from("weeks")
    .select("id, name, week_number")
    .eq("season_id", season.id)
    .order("week_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const week = weekData as Week | null;
  const [{ data: weeklyData }, { data: seasonScoreData }] = await Promise.all([
    week
      ? supabase
          .from("weekly_scores")
          .select("user_id, correct_count, points")
          .eq("week_id", week.id)
          .order("points", { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase
      .from("season_scores")
      .select("user_id, points")
      .eq("season_id", season.id)
      .order("points", { ascending: false }),
  ]);

  const weeklyScores = (weeklyData || []) as WeeklyScore[];
  const seasonScores = (seasonScoreData || []) as SeasonScore[];
  const userIds = Array.from(
    new Set([...weeklyScores.map((score) => score.user_id), ...seasonScores.map((score) => score.user_id)]),
  );
  let profiles: Profile[] = [];

  if (userIds.length > 0) {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", userIds);

    profiles = (profileData || []) as Profile[];
  }

  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const nameFor = (userId: string) => profileById.get(userId)?.display_name?.trim() || "Kullanıcı";
  const weeklyRows = weeklyScores
    .map<LeaderboardRow>((score) => ({
      userId: score.user_id,
      name: nameFor(score.user_id),
      points: score.points,
      correctCount: score.correct_count,
    }))
    .sort((first, second) => second.points - first.points);
  const seasonRows = seasonScores
    .map<LeaderboardRow>((score) => ({
      userId: score.user_id,
      name: nameFor(score.user_id),
      points: score.points,
    }))
    .sort((first, second) => second.points - first.points);

  return (
    <LeaderboardShell>
      <ScoreSection
        title="Haftalık Puan Tablosu"
        subtitle={week?.name || (week ? `${week.week_number}. hafta` : "Aktif hafta yok")}
        rows={weeklyRows}
        showCorrectCount
      />
      <ScoreSection title="Sezon Puan Tablosu" subtitle={season.name} rows={seasonRows} />
    </LeaderboardShell>
  );
}

function LeaderboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <header>
        <p className="text-sm font-semibold text-teal-700">Puan Tablosu</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-950">Sıralama</h1>
      </header>
      {children}
    </div>
  );
}

function ScoreSection({
  title,
  subtitle,
  rows,
  showCorrectCount = false,
}: {
  title: string;
  subtitle: string;
  rows: LeaderboardRow[];
  showCorrectCount?: boolean;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-bold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>

      {rows.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {rows.map((row, index) => (
            <div
              key={row.userId}
              className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{row.name}</p>
                  {showCorrectCount ? (
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {row.correctCount ?? 0} doğru
                    </p>
                  ) : null}
                </div>
              </div>
              <span className="shrink-0 text-sm font-bold text-teal-700">{row.points} puan</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function EmptyState() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm leading-6 text-slate-600">Puanlar henüz hesaplanmadı.</p>
    </section>
  );
}
