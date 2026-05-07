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

type Message = {
  type: "success" | "warning" | "error";
  text: string;
};

export default function PredictionsPage() {
  const router = useRouter();
  const [week, setWeek] = useState<Week | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [choices, setChoices] = useState<Record<string, Pick>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  const selectedCount = useMemo(
    () => matches.filter((match) => choices[match.id]).length,
    [choices, matches],
  );
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

      const existingChoices = ((predictionData || []) as Prediction[]).reduce<Record<string, Pick>>(
        (current, prediction) => ({
          ...current,
          [prediction.match_id]: prediction.pick,
        }),
        {},
      );

      setMatches((matchData || []) as Match[]);
      setChoices(existingChoices);
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
    const rows = matches.map((match) => {
      const pick = choices[match.id];

      return {
        week_id: week.id,
        match_id: match.id,
        user_id: userId,
        pick,
      };
    });

    const { error } = await supabase.from("predictions").upsert(rows, {
      onConflict: "week_id,match_id,user_id",
    });

    setIsSaving(false);

    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }

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
          <p className="text-sm text-slate-600">Tahminler yukleniyor...</p>
        </section>
      ) : null}

      {isEmpty ? (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-bold text-slate-950">Aktif hafta bulunamadi</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Henüz açık bir hafta veya maç listesi yok. Demo veri için Supabase SQL Editor içinde
            `supabase/seed-demo-week.sql` dosyasını çalıştır.
          </p>
        </section>
      ) : null}

      {week && matches.length > 0 ? (
        <>
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

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isClosed}
            className="h-12 w-full rounded-md bg-teal-700 px-4 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isClosed ? "Tahmin süresi doldu" : isSaving ? "Kaydediliyor..." : "Tahminleri Kaydet"}
          </button>
        </>
      ) : null}

      {!week || matches.length === 0 ? (message ? <StatusMessage message={message} /> : null) : null}
    </div>
  );
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
