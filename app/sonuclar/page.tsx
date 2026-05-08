import { createClient } from "@/lib/supabase/server";
import { ResultsReveal, type RevealScore } from "@/components/results-reveal";
import { TeamNameWithLogo } from "@/components/team-name-with-logo";

type Pick = "1" | "X" | "2";
type Result = Pick | "void" | null;

type Week = {
  id: string;
  name: string | null;
  week_number: number;
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

export const dynamic = "force-dynamic";

export default async function ResultsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: week } = await supabase
    .from("weeks")
    .select("id, name, week_number, seasons!inner(is_active)")
    .eq("seasons.is_active", true)
    .order("week_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const activeWeek = week as Week | null;

  if (!activeWeek || !user) {
    return (
      <ResultsShell>
        <EmptyState text="Sonuçlar henüz açıklanmadı." />
      </ResultsShell>
    );
  }

  const [{ data: matchData }, { data: predictionData }, { data: weeklyScoreData }] = await Promise.all([
    supabase
      .from("matches")
      .select("id, position, home_team, away_team, home_external_team_id, away_external_team_id, official_result")
      .eq("week_id", activeWeek.id)
      .order("position", { ascending: true }),
    supabase
      .from("predictions")
      .select("match_id, pick")
      .eq("week_id", activeWeek.id)
      .eq("user_id", user.id),
    supabase
      .from("weekly_scores")
      .select("user_id, correct_count, points")
      .eq("week_id", activeWeek.id),
  ]);

  const matches = (matchData || []) as Match[];
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

  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const revealScores = weeklyScores
    .map<RevealScore>((score) => ({
      userId: score.user_id,
      name: profileById.get(score.user_id)?.display_name?.trim() || "Kullanıcı",
      correctCount: score.correct_count,
      points: score.points,
    }))
    .sort((first, second) => {
      if (first.points !== second.points) {
        return first.points - second.points;
      }

      return first.name.localeCompare(second.name, "tr");
    });
  const predictions = ((predictionData || []) as Prediction[]).reduce<Record<string, Pick>>(
    (current, prediction) => ({
      ...current,
      [prediction.match_id]: prediction.pick,
    }),
    {},
  );
  const hasResults = matches.some((match) => Boolean(match.official_result));
  const correctCount = matches.filter(
    (match) => match.official_result && match.official_result !== "void" && predictions[match.id] === match.official_result,
  ).length;

  return (
    <ResultsShell>
      {!hasResults ? (
        <EmptyState text="Sonuçlar henüz açıklanmadı." />
      ) : (
        <>
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">
              {activeWeek.name || `${activeWeek.week_number}. hafta`}
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-950">
              Doğru: {correctCount} / {matches.length}
            </p>
          </section>

          <div className="space-y-3">
            {matches.map((match) => (
              <MatchResultCard
                key={match.id}
                match={match}
                pick={predictions[match.id]}
              />
            ))}
          </div>

          {revealScores.length > 0 ? <ResultsReveal scores={revealScores} /> : null}
        </>
      )}
    </ResultsShell>
  );
}

function ResultsShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <header>
        <p className="text-sm font-semibold text-teal-700">Sonuçlar</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-950">Maç sonuçları</h1>
      </header>
      {children}
    </div>
  );
}

function MatchResultCard({ match, pick }: { match: Match; pick?: Pick }) {
  const isVoid = match.official_result === "void" || !match.official_result;
  const isCorrect = !isVoid && pick === match.official_result;
  const cardStyle = isVoid
    ? "border-slate-200 bg-white"
    : isCorrect
      ? "border-teal-200 bg-teal-50"
      : "border-red-200 bg-red-50";
  const resultLabel = match.official_result === "void" ? "İptal" : match.official_result || "-";

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
