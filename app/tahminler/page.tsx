"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

type Pick = "1" | "X" | "2";

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
};

type Prediction = {
  match_id: string;
  pick: Pick;
};

type PublicPrediction = Prediction & {
  user_id: string;
};

type Profile = {
  id: string;
  display_name: string | null;
};

type UserPredictionGroup = {
  userId: string;
  label: string;
  picks: Record<string, Pick>;
  count: number;
};

type Message = {
  type: "success" | "warning" | "error";
  text: string;
};

export default function PredictionsPage() {
  const router = useRouter();
  const [week, setWeek] = useState<Week | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [choices, setChoices] = useState<Record<string, Pick>>({});
  const [savedChoices, setSavedChoices] = useState<Record<string, Pick>>({});
  const [allPredictionGroups, setAllPredictionGroups] = useState<UserPredictionGroup[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  const selectedCount = useMemo(
    () => matches.filter((match) => choices[match.id]).length,
    [choices, matches],
  );
  const missingMatches = useMemo(
    () => matches.filter((match) => !choices[match.id]).map((match) => match.position),
    [choices, matches],
  );
  const hasUnsavedChanges = useMemo(
    () => !areChoicesEqual(choices, savedChoices, matches),
    [choices, matches, savedChoices],
  );
  const totalCount = matches.length || 15;
  const missingCount = Math.max(totalCount - selectedCount, 0);
  const progressPercent = matches.length > 0 ? Math.round((selectedCount / matches.length) * 100) : 0;
  const saveStatusText = hasUnsavedChanges
    ? "Kaydedilmemiş değişiklikler var"
    : lastSavedAt
      ? "Tahminler kaydedildi"
      : "Tahminler güncel";
  const isClosed = week ? new Date() >= new Date(week.closes_at) : false;
  const isEmpty = !isLoading && (!week || matches.length === 0);

  useEffect(() => {
    let isMounted = true;

    async function loadPredictions() {
      const supabase = createClient();
      setIsLoading(true);
      setMessage(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!isMounted) {
        return;
      }

      if (userError || !user) {
        router.push("/giris?next=/tahminler");
        return;
      }

      setUserId(user.id);

      const { data: weekData, error: weekError } = await supabase
        .from("weeks")
        .select("id, name, week_number, opens_at, closes_at, seasons!inner(is_active)")
        .eq("seasons.is_active", true)
        .order("week_number", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (weekError) {
        setMessage({ type: "error", text: weekError.message });
        setIsLoading(false);
        return;
      }

      if (!weekData) {
        setWeek(null);
        setMatches([]);
        setChoices({});
        setSavedChoices({});
        setAllPredictionGroups([]);
        setLastSavedAt(null);
        setIsLoading(false);
        return;
      }

      const activeWeek = {
        id: weekData.id,
        name: weekData.name,
        week_number: weekData.week_number,
        opens_at: weekData.opens_at,
        closes_at: weekData.closes_at,
      };
      const activeWeekIsClosed = new Date() >= new Date(activeWeek.closes_at);

      setWeek(activeWeek);

      const [{ data: matchData, error: matchError }, { data: predictionData, error: predictionError }] =
        await Promise.all([
          supabase
            .from("matches")
            .select("id, position, home_team, away_team")
            .eq("week_id", activeWeek.id)
            .order("position", { ascending: true }),
          supabase
            .from("predictions")
            .select("match_id, pick")
            .eq("week_id", activeWeek.id)
            .eq("user_id", user.id),
        ]);

      if (!isMounted) {
        return;
      }

      if (matchError || predictionError) {
        setMessage({
          type: "error",
          text: matchError?.message || predictionError?.message || "Tahminler yuklenemedi.",
        });
        setIsLoading(false);
        return;
      }

      const loadedMatches = (matchData || []) as Match[];
      const existingChoices = ((predictionData || []) as Prediction[]).reduce<Record<string, Pick>>(
        (current, prediction) => ({
          ...current,
          [prediction.match_id]: prediction.pick,
        }),
        {},
      );

      setMatches(loadedMatches);
      setChoices(existingChoices);
      setSavedChoices(existingChoices);
      setLastSavedAt(null);

      if (!activeWeekIsClosed) {
        setAllPredictionGroups([]);
        setIsLoading(false);
        return;
      }

      const { data: publicPredictionData, error: publicPredictionError } = await supabase
        .from("predictions")
        .select("user_id, match_id, pick")
        .eq("week_id", activeWeek.id);

      if (!isMounted) {
        return;
      }

      if (publicPredictionError) {
        setAllPredictionGroups([]);
        setMessage({ type: "error", text: publicPredictionError.message });
        setIsLoading(false);
        return;
      }

      const publicPredictions = (publicPredictionData || []) as PublicPrediction[];
      const userIds = Array.from(new Set(publicPredictions.map((prediction) => prediction.user_id)));
      let profiles: Profile[] = [];

      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", userIds);

        profiles = (profileData || []) as Profile[];
      }

      if (!isMounted) {
        return;
      }

      const profileByUserId = new Map(profiles.map((profile) => [profile.id, profile]));
      const grouped = publicPredictions.reduce<Map<string, UserPredictionGroup>>((current, prediction) => {
        const profile = profileByUserId.get(prediction.user_id);
        const label =
          profile?.display_name?.trim() ||
          (prediction.user_id === user.id ? user.email || "" : "") ||
          "Kullanıcı";
        const existing = current.get(prediction.user_id) || {
          userId: prediction.user_id,
          label,
          picks: {},
          count: 0,
        };

        existing.picks[prediction.match_id] = prediction.pick;
        existing.count = Object.keys(existing.picks).length;
        current.set(prediction.user_id, existing);

        return current;
      }, new Map());

      setAllPredictionGroups(
        Array.from(grouped.values()).sort((first, second) => first.label.localeCompare(second.label, "tr")),
      );
      setIsLoading(false);
    }

    loadPredictions();

    return () => {
      isMounted = false;
    };
  }, [router]);

  async function handleSave() {
    if (!week || !userId || isClosed) {
      return;
    }

    if (!matches.every((match) => choices[match.id])) {
      setMessage({ type: "warning", text: "Lütfen tüm maçlar için tahmin seç." });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    const supabase = createClient();
    const rows = matches.map((match) => ({
      week_id: week.id,
      match_id: match.id,
      user_id: userId,
      pick: choices[match.id] as Pick,
    }));

    const { error } = await supabase.from("predictions").upsert(rows, {
      onConflict: "week_id,match_id,user_id",
    });

    setIsSaving(false);

    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }

    setSavedChoices(choices);
    setLastSavedAt(new Date());
    setMessage({ type: "success", text: "Tahminlerin kaydedildi." });
  }

  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <p className="text-sm font-semibold text-teal-700">Tahminler</p>
        <div className="flex items-end justify-between gap-3">
          <h1 className="text-2xl font-bold text-slate-950">Haftanın kuponu</h1>
          <span className="rounded-full bg-teal-100 px-3 py-1 text-sm font-bold text-teal-800">
            {selectedCount}/{matches.length || 15}
          </span>
        </div>
        <p className="text-sm leading-6 text-slate-600">
          Her maç için yalnızca bir seçim yap: 1, X veya 2.
        </p>
      </header>

      {isLoading ? (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">Tahminler yükleniyor...</p>
        </section>
      ) : null}

      {isEmpty ? (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-bold text-slate-950">Aktif hafta bulunamadı</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Henüz açık bir hafta veya maç listesi yok. Demo veri için Supabase SQL Editor içinde
            `supabase/seed-demo-week.sql` dosyasını çalıştır.
          </p>
        </section>
      ) : null}

      {week && matches.length > 0 ? (
        <>
          <ProgressSummary
            selectedCount={selectedCount}
            totalCount={totalCount}
            missingCount={missingCount}
            missingMatches={missingMatches}
            progressPercent={progressPercent}
            saveStatusText={saveStatusText}
            lastSavedAt={lastSavedAt}
          />

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-bold text-slate-950">
              {week.name || `${week.week_number}. hafta`}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Kapanış: {new Intl.DateTimeFormat("tr-TR", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(week.closes_at))}
            </p>
            {isClosed ? (
              <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                Tahmin süresi doldu.
              </p>
            ) : null}
          </section>

          <div className="space-y-3">
            {matches.map((match) => (
              <article
                key={match.id}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div>
                  <p className="text-xs font-bold uppercase tracking-normal text-slate-400">
                    Maç {match.position}
                  </p>
                  <h2 className="mt-1 text-base font-bold text-slate-950">
                    {match.home_team} - {match.away_team}
                  </h2>
                </div>

                <div
                  className="mt-4 grid grid-cols-3 gap-2"
                  role="group"
                  aria-label={`${match.home_team} - ${match.away_team}`}
                >
                  {(["1", "X", "2"] as const).map((pick) => {
                    const isSelected = choices[match.id] === pick;

                    return (
                      <button
                        key={pick}
                        type="button"
                        aria-pressed={isSelected}
                        disabled={isClosed}
                        onClick={() => {
                          setMessage(null);
                          setChoices((current) => ({
                            ...current,
                            [match.id]: pick,
                          }));
                        }}
                        className={`h-11 rounded-md border text-sm font-bold transition disabled:cursor-not-allowed ${
                          isSelected
                            ? "border-teal-700 bg-teal-700 text-white shadow-sm disabled:opacity-80"
                            : "border-slate-200 bg-slate-50 text-slate-700 hover:border-teal-300 disabled:opacity-50"
                        }`}
                      >
                        {pick}
                      </button>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>

          {message ? <StatusMessage message={message} /> : null}

          {!isClosed ? (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || (!hasUnsavedChanges && selectedCount === matches.length)}
              className="h-12 w-full rounded-md bg-teal-700 px-4 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving
                ? "Kaydediliyor..."
                : !hasUnsavedChanges && selectedCount === matches.length
                  ? "Güncel"
                  : "Tahminleri Kaydet"}
            </button>
          ) : null}

          {isClosed ? (
            <AllPredictionsSection groups={allPredictionGroups} matches={matches} />
          ) : null}
        </>
      ) : null}

      {!week || matches.length === 0 ? (message ? <StatusMessage message={message} /> : null) : null}
    </div>
  );
}

function ProgressSummary({
  selectedCount,
  totalCount,
  missingCount,
  missingMatches,
  progressPercent,
  saveStatusText,
  lastSavedAt,
}: {
  selectedCount: number;
  totalCount: number;
  missingCount: number;
  missingMatches: number[];
  progressPercent: number;
  saveStatusText: string;
  lastSavedAt: Date | null;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-teal-700">Tahmin durumu</p>
          <h2 className="mt-1 text-xl font-bold text-slate-950">
            {selectedCount}/{totalCount} maç seçildi
          </h2>
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
          {progressPercent}%
        </span>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-teal-700 transition-all"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="mt-3 space-y-1 text-sm">
        <p className={missingCount > 0 ? "font-semibold text-amber-700" : "font-semibold text-teal-700"}>
          {missingCount > 0 ? `${missingCount} maç eksik` : "Tüm maçlar seçildi"}
        </p>
        {missingMatches.length > 0 ? (
          <p className="text-slate-500">Eksik maçlar: {missingMatches.join(", ")}</p>
        ) : null}
        <p className="font-semibold text-slate-700">{saveStatusText}</p>
        {lastSavedAt ? (
          <p className="text-slate-500">
            Son kaydetme:{" "}
            {new Intl.DateTimeFormat("tr-TR", {
              hour: "2-digit",
              minute: "2-digit",
            }).format(lastSavedAt)}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function AllPredictionsSection({
  groups,
  matches,
}: {
  groups: UserPredictionGroup[];
  matches: Match[];
}) {
  return (
    <section className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-teal-700">Kapalı hafta</p>
        <h2 className="mt-1 text-xl font-bold text-slate-950">Herkesin Tahminleri</h2>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm leading-6 text-slate-600">
            Bu hafta için gösterilecek tahmin bulunamadı.
          </p>
        </div>
      ) : null}

      {groups.map((group) => (
        <article
          key={group.userId}
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-base font-bold text-slate-950">{group.label}</h3>
            <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
              {group.count}/{matches.length} tahmin
            </span>
          </div>

          <div className="mt-4 space-y-2">
            {matches.map((match) => {
              const matchLabel =
                match.home_team && match.away_team
                  ? `${match.home_team} - ${match.away_team}`
                  : `Maç ${match.position}`;

              return (
              <div
                key={`${group.userId}-${match.id}`}
                className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <p className="text-sm font-semibold text-slate-700">{matchLabel}</p>
                <p className="shrink-0 text-base font-bold text-slate-950">
                  {group.picks[match.id] || "-"}
                </p>
              </div>
              );
            })}
          </div>
        </article>
      ))}
    </section>
  );
}

function areChoicesEqual(
  firstChoices: Record<string, Pick>,
  secondChoices: Record<string, Pick>,
  matches: Match[],
) {
  return matches.every((match) => firstChoices[match.id] === secondChoices[match.id]);
}

function StatusMessage({ message }: { message: Message }) {
  const styles = {
    success: "border-teal-200 bg-teal-50 text-teal-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    error: "border-red-200 bg-red-50 text-red-800",
  };

  return (
    <p className={`rounded-md border px-3 py-2 text-sm font-semibold ${styles[message.type]}`}>
      {message.text}
    </p>
  );
}
