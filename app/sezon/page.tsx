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
};

type WeeklyScore = {
  week_id: string;
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

type LeaderRow = {
  userId: string;
  name: string;
  points: number;
};

type PlayerStat = {
  userId: string;
  name: string;
  totalPoints: number;
  totalCorrect: number;
  playedWeeks: number;
  averageCorrect: number;
  bestWeek: number;
  worstWeek: number;
  weeklyWins: number;
};

type WeeklyWinner = {
  weekId: string;
  weekLabel: string;
  weekNumber: number;
  winners: string[];
  points: number;
  correctCount: number;
};

export const dynamic = "force-dynamic";

export default async function SeasonStatsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/giris?next=/sezon");
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
      <SeasonShell>
        <EmptyState text="Aktif sezon bulunamadı." />
      </SeasonShell>
    );
  }

  const { data: weekData } = await supabase
    .from("weeks")
    .select("id, name, week_number")
    .eq("season_id", season.id)
    .order("week_number", { ascending: true });
  const weeks = (weekData || []) as Week[];
  const weekIds = weeks.map((week) => week.id);
  const [{ data: weeklyScoreData }, { data: seasonScoreData }] = await Promise.all([
    weekIds.length > 0
      ? supabase
          .from("weekly_scores")
          .select("week_id, user_id, correct_count, points")
          .in("week_id", weekIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from("season_scores")
      .select("user_id, points")
      .eq("season_id", season.id)
      .order("points", { ascending: false }),
  ]);

  const weeklyScores = (weeklyScoreData || []) as WeeklyScore[];
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
  const seasonRows = seasonScores
    .map<LeaderRow>((score) => ({
      userId: score.user_id,
      name: nameFor(score.user_id),
      points: score.points,
    }))
    .sort((first, second) => {
      if (second.points !== first.points) {
        return second.points - first.points;
      }

      return first.name.localeCompare(second.name, "tr");
    });
  const weekById = new Map(weeks.map((week) => [week.id, week]));
  const weeklyScoresByWeek = weeklyScores.reduce<Map<string, WeeklyScore[]>>((current, score) => {
    current.set(score.week_id, [...(current.get(score.week_id) || []), score]);
    return current;
  }, new Map());
  const weeklyWinCountByUser = new Map<string, number>();
  const weeklyWinners = weeks
    .map<WeeklyWinner | null>((week) => {
      const scores = weeklyScoresByWeek.get(week.id) || [];

      if (scores.length === 0) {
        return null;
      }

      const topPoints = Math.max(...scores.map((score) => score.points));
      const topCorrectCount = Math.max(
        ...scores.filter((score) => score.points === topPoints).map((score) => score.correct_count),
      );
      const winners = scores.filter(
        (score) => score.points === topPoints && score.correct_count === topCorrectCount,
      );

      winners.forEach((winner) => {
        weeklyWinCountByUser.set(winner.user_id, (weeklyWinCountByUser.get(winner.user_id) || 0) + 1);
      });

      return {
        weekId: week.id,
        weekLabel: week.name || `${week.week_number}. hafta`,
        weekNumber: week.week_number,
        winners: winners.map((winner) => nameFor(winner.user_id)).sort((first, second) => first.localeCompare(second, "tr")),
        points: topPoints,
        correctCount: topCorrectCount,
      };
    })
    .filter((winner): winner is WeeklyWinner => Boolean(winner))
    .sort((first, second) => second.weekNumber - first.weekNumber);
  const playerStats = Array.from(
    weeklyScores.reduce<Map<string, WeeklyScore[]>>((current, score) => {
      current.set(score.user_id, [...(current.get(score.user_id) || []), score]);
      return current;
    }, new Map()),
  )
    .map<PlayerStat>(([userId, scores]) => {
      const totalPoints = scores.reduce((total, score) => total + score.points, 0);
      const totalCorrect = scores.reduce((total, score) => total + score.correct_count, 0);
      const correctCounts = scores.map((score) => score.correct_count);

      return {
        userId,
        name: nameFor(userId),
        totalPoints,
        totalCorrect,
        playedWeeks: scores.length,
        averageCorrect: scores.length > 0 ? totalCorrect / scores.length : 0,
        bestWeek: Math.max(...correctCounts),
        worstWeek: Math.min(...correctCounts),
        weeklyWins: weeklyWinCountByUser.get(userId) || 0,
      };
    })
    .sort((first, second) => {
      if (second.totalPoints !== first.totalPoints) {
        return second.totalPoints - first.totalPoints;
      }

      return first.name.localeCompare(second.name, "tr");
    });

  return (
    <SeasonShell>
      <ChampionCard rows={seasonRows} />
      <ScoreTable rows={seasonRows} />
      <PlayerStatsSection stats={playerStats} />
      <WeeklyWinnersSection winners={weeklyWinners} weekById={weekById} />
    </SeasonShell>
  );
}

function SeasonShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <header>
        <p className="text-sm font-semibold text-teal-700">Sezon</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-950">Sezon Özeti</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Fokur Toto Ligi genel durumu</p>
      </header>
      {children}
    </div>
  );
}

function ChampionCard({ rows }: { rows: LeaderRow[] }) {
  if (rows.length === 0) {
    return <EmptyState text="Sezon puanları henüz oluşmadı." />;
  }

  const topPoints = rows[0].points;
  const leaders = rows.filter((row) => row.points === topPoints);

  return (
    <section className="rounded-lg border border-teal-200 bg-teal-700 p-5 text-white shadow-sm">
      <p className="text-sm font-semibold text-teal-100">
        {leaders.length === 1 ? "Sezon Lideri" : "Sezon Liderleri"}
      </p>
      <div className="mt-3 space-y-2">
        {leaders.map((leader) => (
          <div key={leader.userId} className="flex items-center justify-between gap-3">
            <p className="min-w-0 truncate text-xl font-bold">{leader.name}</p>
            <p className="shrink-0 rounded-full bg-white px-3 py-1 text-sm font-bold text-teal-800">
              {leader.points} puan
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ScoreTable({ rows }: { rows: LeaderRow[] }) {
  return (
    <section className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-teal-700">Genel Puan Tablosu</p>
        <h2 className="mt-1 text-xl font-bold text-slate-950">Sezon sıralaması</h2>
      </div>

      {rows.length === 0 ? (
        <EmptyState text="Sezon puanları henüz oluşmadı." />
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
                <p className="truncate text-sm font-semibold text-slate-900">{row.name}</p>
              </div>
              <span className="shrink-0 text-sm font-bold text-teal-700">{row.points} puan</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function PlayerStatsSection({ stats }: { stats: PlayerStat[] }) {
  return (
    <section className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-teal-700">Oyuncu İstatistikleri</p>
        <h2 className="mt-1 text-xl font-bold text-slate-950">Performans özeti</h2>
      </div>

      {stats.length === 0 ? (
        <EmptyState text="Oyuncu istatistikleri henüz oluşmadı." />
      ) : (
        <div className="space-y-3">
          {stats.map((stat) => (
            <article
              key={stat.userId}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-bold text-slate-950">{stat.name}</h3>
                  <p className="mt-1 text-sm font-semibold text-teal-700">
                    {stat.totalPoints} puan · {stat.totalCorrect} doğru
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                  {stat.playedWeeks} hafta
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <StatPill label="Ortalama doğru" value={formatAverage(stat.averageCorrect)} />
                <StatPill label="En iyi hafta" value={`${stat.bestWeek} doğru`} />
                <StatPill label="En zayıf hafta" value={`${stat.worstWeek} doğru`} />
                <StatPill label="Haftalık birincilik" value={String(stat.weeklyWins)} />
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function WeeklyWinnersSection({
  winners,
  weekById,
}: {
  winners: WeeklyWinner[];
  weekById: Map<string, Week>;
}) {
  return (
    <section className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-teal-700">Haftalık Kazananlar</p>
        <h2 className="mt-1 text-xl font-bold text-slate-950">Hafta hafta liderler</h2>
      </div>

      {winners.length === 0 ? (
        <EmptyState text="Haftalık kazananlar henüz oluşmadı." />
      ) : (
        <div className="space-y-3">
          {winners.map((winner) => (
            <article
              key={winner.weekId}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-normal text-slate-400">
                    {weekById.get(winner.weekId)?.week_number ?? winner.weekNumber}. hafta
                  </p>
                  <h3 className="mt-1 truncate text-base font-bold text-slate-950">
                    {winner.weekLabel}
                  </h3>
                </div>
                <span className="shrink-0 rounded-full bg-teal-100 px-3 py-1 text-xs font-bold text-teal-800">
                  {winner.points} puan
                </span>
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-700">
                {winner.winners.join(", ")}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                Kazanan skor: {winner.correctCount} doğru
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 px-3 py-2">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-bold text-slate-950">{value}</p>
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

function formatAverage(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(value);
}
