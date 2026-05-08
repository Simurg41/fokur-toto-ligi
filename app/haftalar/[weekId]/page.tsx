import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TeamNameWithLogo } from "@/components/team-name-with-logo";

type Pick = "1" | "X" | "2";
type Result = Pick | "void" | null;

type Week = {
  id: string;
  name: string | null;
  week_number: number;
  opens_at: string;
  closes_at: string;
};

type Match = {
  id: string;
  position: number;
  home_team: string;
  away_team: string;
  home_external_team_id: number | null;
  away_external_team_id: number | null;
  official_result: Result;
};

type Prediction = {
  match_id: string;
  pick: Pick;
};

type WeeklyScore = {
  user_id: string;
  correct_count: number;
  points: number;
};

type Profile = {
  id: string;
  display_name: string | null;
};

type PageProps = {
  params: Promise<{
    weekId: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function WeekDetailPage({ params }: PageProps) {
  const { weekId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/giris?next=/haftalar/${weekId}`);
  }

  const { data: weekData } = await supabase
    .from("weeks")
    .select("id, name, week_number, opens_at, closes_at")
    .eq("id", weekId)
    .maybeSingle();
  const week = weekData as Week | null;

  if (!week) {
    notFound();
  }

  const [
    { data: matchData },
    { data: predictionData, error: predictionError },
    { data: weeklyScoreData },
  ] = await Promise.all([
    supabase
      .from("matches")
      .select("id, position, home_team, away_team, home_external_team_id, away_external_team_id, official_result")
      .eq("week_id", week.id)
      .order("position", { ascending: true }),
    supabase
      .from("predictions")
      .select("match_id, pick")
      .eq("week_id", week.id)
      .eq("user_id", user.id),
    supabase
      .from("weekly_scores")
      .select("user_id, correct_count, points")
      .eq("week_id", week.id),
  ]);

  const matches = (matchData || []) as Match[];
  const predictions = predictionError
    ? {}
    : ((predictionData || []) as Prediction[]).reduce<Record<string, Pick>>(
        (current, prediction) => ({
          ...current,
          [prediction.match_id]: prediction.pick,
        }),
        {},
      );
  const weeklyScores = (weeklyScoreData || []) as WeeklyScore[];
  const userIds = weeklyScores.map((score) => score.user_id);
  let profiles: Profile[] = [];

  if (userIds.length > 0) {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", userIds);

    profiles = (profileData || []) as Profile[];
  }

  const correctCount = matches.filter((match) => {
    const result = match.official_result;
    return result && result !== "void" && predictions[match.id] === result;
  }).length;
  const hasPredictions = Object.keys(predictions).length > 0;
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const leaderboardRows = weeklyScores
    .map((score) => ({
      ...score,
      name: profileById.get(score.user_id)?.display_name?.trim() || "Kullanıcı",
    }))
    .sort((first, second) => {
      if (second.points !== first.points) {
        return second.points - first.points;
      }

      if (second.correct_count !== first.correct_count) {
        return second.correct_count - first.correct_count;
      }

      return first.name.localeCompare(second.name, "tr");
    });

  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <Link href="/haftalar" className="text-sm font-bold text-teal-700">
          Haftalara dön
        </Link>
        <h1 className="text-2xl font-bold text-slate-950">
          {week.name || `${week.week_number}. hafta`}
        </h1>
        <p className="text-sm leading-6 text-slate-600">
          Açılış: {formatDate(week.opens_at)} · Kapanış: {formatDate(week.closes_at)}
        </p>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-slate-500">Senin özetin</p>
        <p className="mt-2 text-2xl font-bold text-slate-950">Doğru: {correctCount} / 15</p>
      </section>

      {predictionError ? (
        <EmptyState text="Tahminler şu anda gösterilemiyor. Hafta kapandıktan sonra tekrar kontrol edebilirsin." />
      ) : null}

      {!predictionError && !hasPredictions ? (
        <EmptyState text="Bu hafta için tahmin bulunamadı." />
      ) : null}

      <section className="space-y-3">
        {matches.map((match) => (
          <MatchHistoryCard key={match.id} match={match} pick={predictions[match.id]} />
        ))}
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-teal-700">Haftalık puan tablosu</p>
          <h2 className="mt-1 text-xl font-bold text-slate-950">Sıralama</h2>
        </div>

        {leaderboardRows.length === 0 ? (
          <EmptyState text="Puanlar henüz hesaplanmadı." />
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            {leaderboardRows.map((row, index) => (
              <div
                key={row.user_id}
                className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{row.name}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {row.correct_count} doğru
                    </p>
                  </div>
                </div>
                <span className="shrink-0 text-sm font-bold text-teal-700">{row.points} puan</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MatchHistoryCard({ match, pick }: { match: Match; pick?: Pick }) {
  const result = match.official_result;
  const isNeutral = !result || result === "void" || !pick;
  const isCorrect = !isNeutral && pick === result;
  const cardStyle = isNeutral
    ? "border-slate-200 bg-white"
    : isCorrect
      ? "border-teal-200 bg-teal-50"
      : "border-red-200 bg-red-50";
  const resultLabel = result === "void" ? "İptal" : result || "-";

  return (
    <article className={`rounded-lg border p-4 shadow-sm ${cardStyle}`}>
      <p className="text-xs font-bold uppercase tracking-normal text-slate-500">
        Maç {match.position}
      </p>
      <div className="mt-2 space-y-1">
        <TeamNameWithLogo
          name={match.home_team}
          externalTeamId={match.home_external_team_id}
          size="md"
        />
        <TeamNameWithLogo
          name={match.away_team}
          externalTeamId={match.away_external_team_id}
          size="md"
        />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-md bg-white/70 px-3 py-2">
          <p className="text-xs font-semibold text-slate-500">Senin tahminin</p>
          <p className="mt-1 text-lg font-bold text-slate-950">{pick || "-"}</p>
        </div>
        <div className="rounded-md bg-white/70 px-3 py-2">
          <p className="text-xs font-semibold text-slate-500">Sonuç</p>
          <p className="mt-1 text-lg font-bold text-slate-950">{resultLabel}</p>
        </div>
      </div>
    </article>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm leading-6 text-slate-600">{text}</p>
    </section>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
