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
  rankChange?: RankChange;
};

type RankChange =
  | { type: "up"; value: number }
  | { type: "down"; value: number }
  | { type: "same" }
  | { type: "new" };

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
  const [{ data: weeklyData }, { data: seasonScoreData }, { data: previousWeekData }] = await Promise.all([
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
    week
      ? supabase
          .from("weeks")
          .select("id, name, week_number")
          .eq("season_id", season.id)
          .lt("week_number", week.week_number)
          .order("week_number", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const weeklyScores = (weeklyData || []) as WeeklyScore[];
  const seasonScores = (seasonScoreData || []) as SeasonScore[];
  const previousWeeks = (previousWeekData || []) as Week[];
  let previousWeeklyScores: WeeklyScore[] = [];
  let previousScoredWeek: Week | null = null;

  if (previousWeeks.length > 0) {
    const { data: previousScoreData } = await supabase
      .from("weekly_scores")
      .select("user_id, correct_count, points, week_id")
      .in("week_id", previousWeeks.map((previousWeek) => previousWeek.id));
    const allPreviousScores = (previousScoreData || []) as (WeeklyScore & { week_id: string })[];
    previousScoredWeek =
      previousWeeks.find((previousWeek) =>
        allPreviousScores.some((score) => score.week_id === previousWeek.id),
      ) || null;
    previousWeeklyScores = previousScoredWeek
      ? allPreviousScores.filter((score) => score.week_id === previousScoredWeek?.id)
      : [];
  }

  const userIds = Array.from(
    new Set([
      ...weeklyScores.map((score) => score.user_id),
      ...seasonScores.map((score) => score.user_id),
      ...previousWeeklyScores.map((score) => score.user_id),
    ]),
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
  const previousRanks = calculateRanks(previousWeeklyScores, nameFor);
  const weeklyRows = weeklyScores
    .map<LeaderboardRow>((score) => ({
      userId: score.user_id,
      name: nameFor(score.user_id),
      points: score.points,
      correctCount: score.correct_count,
      rankChange: getRankChange(score.user_id, weeklyScores, previousRanks, nameFor),
    }))
    .sort((first, second) => sortRows(first, second));
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
        rankChangeHelp={
          previousScoredWeek
            ? "Değişim, bir önceki puanlanmış haftaya göre hesaplanır."
            : "Karşılaştırma için önceki hafta yok."
        }
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
  rankChangeHelp,
}: {
  title: string;
  subtitle: string;
  rows: LeaderboardRow[];
  showCorrectCount?: boolean;
  rankChangeHelp?: string;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-bold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        {rankChangeHelp ? <p className="mt-2 text-xs font-semibold text-slate-500">{rankChangeHelp}</p> : null}
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
                  {row.rankChange ? <RankChangeBadge change={row.rankChange} /> : null}
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

function RankChangeBadge({ change }: { change: RankChange }) {
  const styles = {
    up: "text-teal-700",
    down: "text-red-700",
    same: "text-slate-500",
    new: "text-sky-700",
  };
  const label =
    change.type === "up"
      ? `▲ +${change.value}`
      : change.type === "down"
        ? `▼ -${change.value}`
        : change.type === "new"
          ? "Yeni"
          : "—";

  return <p className={`mt-1 text-xs font-bold ${styles[change.type]}`}>{label}</p>;
}

function getRankChange(
  userId: string,
  currentScores: WeeklyScore[],
  previousRanks: Map<string, number>,
  nameFor: (userId: string) => string,
): RankChange {
  if (previousRanks.size === 0) {
    return { type: "same" };
  }

  const currentRank = calculateRanks(currentScores, nameFor).get(userId);
  const previousRank = previousRanks.get(userId);

  if (!currentRank) {
    return { type: "same" };
  }

  if (!previousRank) {
    return { type: "new" };
  }

  const difference = previousRank - currentRank;

  if (difference > 0) {
    return { type: "up", value: difference };
  }

  if (difference < 0) {
    return { type: "down", value: Math.abs(difference) };
  }

  return { type: "same" };
}

function calculateRanks(scores: WeeklyScore[], nameFor: (userId: string) => string) {
  const sortedScores = [...scores].sort((first, second) => {
    if (second.points !== first.points) {
      return second.points - first.points;
    }

    return nameFor(first.user_id).localeCompare(nameFor(second.user_id), "tr");
  });
  const ranks = new Map<string, number>();
  let lastPoints: number | null = null;
  let lastRank = 0;

  sortedScores.forEach((score, index) => {
    const rank = score.points === lastPoints ? lastRank : index + 1;
    ranks.set(score.user_id, rank);
    lastPoints = score.points;
    lastRank = rank;
  });

  return ranks;
}

function sortRows(first: LeaderboardRow, second: LeaderboardRow) {
  if (second.points !== first.points) {
    return second.points - first.points;
  }

  return first.name.localeCompare(second.name, "tr");
}

function EmptyState() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm leading-6 text-slate-600">Puanlar henüz hesaplanmadı.</p>
    </section>
  );
}
