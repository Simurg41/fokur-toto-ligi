"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

type Result = "" | "1" | "X" | "2" | "void";

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

type Match = {
  id: string;
  position: number;
  home_team: string;
  away_team: string;
  official_result: Result | null;
};

type Message = {
  type: "success" | "error";
  text: string;
};

const resultOptions: { value: Result; label: string }[] = [
  { value: "", label: "Boş" },
  { value: "1", label: "1" },
  { value: "X", label: "X" },
  { value: "2", label: "2" },
  { value: "void", label: "void" },
];

export default function AdminPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [season, setSeason] = useState<Season | null>(null);
  const [week, setWeek] = useState<Week | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [results, setResults] = useState<Record<string, Result>>({});
  const [message, setMessage] = useState<Message | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  const predictionsAreOpen = useMemo(() => {
    if (!week) {
      return false;
    }

    const now = new Date();
    return now >= new Date(week.opens_at) && now < new Date(week.closes_at);
  }, [week]);

  useEffect(() => {
    let isMounted = true;

    async function loadAdminData() {
      const supabase = createClient();
      setIsLoading(true);
      setMessage(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted) {
        return;
      }

      if (!user) {
        router.push("/giris?next=/admin");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (profile?.role !== "admin") {
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      setIsAdmin(true);

      const { data: seasonData, error: seasonError } = await supabase
        .from("seasons")
        .select("id, name")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (seasonError || !seasonData) {
        setMessage({ type: "error", text: seasonError?.message || "Aktif sezon bulunamadı." });
        setIsLoading(false);
        return;
      }

      setSeason(seasonData as Season);

      const { data: weekData, error: weekError } = await supabase
        .from("weeks")
        .select("id, name, week_number, opens_at, closes_at")
        .eq("season_id", seasonData.id)
        .order("week_number", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (weekError || !weekData) {
        setMessage({ type: "error", text: weekError?.message || "Hafta bulunamadı." });
        setIsLoading(false);
        return;
      }

      setWeek(weekData as Week);

      const { data: matchData, error: matchError } = await supabase
        .from("matches")
        .select("id, position, home_team, away_team, official_result")
        .eq("week_id", weekData.id)
        .order("position", { ascending: true });

      if (!isMounted) {
        return;
      }

      if (matchError) {
        setMessage({ type: "error", text: matchError.message });
        setIsLoading(false);
        return;
      }

      const loadedMatches = (matchData || []) as Match[];
      setMatches(loadedMatches);
      setResults(
        loadedMatches.reduce<Record<string, Result>>((current, match) => {
          current[match.id] = match.official_result || "";
          return current;
        }, {}),
      );
      setIsLoading(false);
    }

    loadAdminData();

    return () => {
      isMounted = false;
    };
  }, [router]);

  async function updateWeekTimes(opensAt: string, closesAt: string, successText: string) {
    if (!week) {
      return;
    }

    setIsWorking(true);
    setMessage(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("weeks")
      .update({ opens_at: opensAt, closes_at: closesAt })
      .eq("id", week.id);

    setIsWorking(false);

    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }

    setWeek({ ...week, opens_at: opensAt, closes_at: closesAt });
    setMessage({ type: "success", text: successText });
  }

  async function closeWeek() {
    await updateWeekTimes(
      week?.opens_at || new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      new Date(Date.now() - 60 * 1000).toISOString(),
      "Hafta kapatıldı.",
    );
  }

  async function reopenWeek() {
    await updateWeekTimes(
      new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      "Hafta tekrar açıldı.",
    );
  }

  async function saveResults() {
    setIsWorking(true);
    setMessage(null);

    const supabase = createClient();
    const updates = matches.map((match) =>
      supabase
        .from("matches")
        .update({ official_result: results[match.id] || null })
        .eq("id", match.id),
    );
    const responses = await Promise.all(updates);
    const error = responses.find((response) => response.error)?.error;

    setIsWorking(false);

    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }

    setMatches((current) =>
      current.map((match) => ({
        ...match,
        official_result: results[match.id] || null,
      })),
    );
    setMessage({ type: "success", text: "Sonuçlar kaydedildi." });
  }

  async function recalculateScores() {
    if (!week) {
      return;
    }

    setIsWorking(true);
    setMessage(null);

    const supabase = createClient();
    const { data, error } = await supabase.rpc("recalculate_scores_for_week", {
      target_week_id: week.id,
    });

    setIsWorking(false);

    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }

    setMessage({
      type: "success",
      text: `Puanlar hesaplandı. ${data?.users_scored ?? 0} kullanıcı skorlandı.`,
    });
  }

  if (isLoading) {
    return <AdminShell><InfoCard text="Admin paneli yükleniyor..." /></AdminShell>;
  }

  if (!isAdmin) {
    return <AdminShell><InfoCard text="Bu sayfaya erişim yetkin yok." /></AdminShell>;
  }

  return (
    <AdminShell>
      {message ? <StatusMessage message={message} /> : null}

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-slate-500">{season?.name || "Aktif sezon"}</p>
        <h2 className="mt-1 text-xl font-bold text-slate-950">
          {week?.name || (week ? `${week.week_number}. hafta` : "Hafta yok")}
        </h2>
        {week ? (
          <div className="mt-3 space-y-1 text-sm text-slate-600">
            <p>Açılış: {formatDate(week.opens_at)}</p>
            <p>Kapanış: {formatDate(week.closes_at)}</p>
            <p className={predictionsAreOpen ? "font-bold text-teal-700" : "font-bold text-amber-700"}>
              {predictionsAreOpen ? "Tahminler açık" : "Tahminler kapalı"}
            </p>
          </div>
        ) : null}
      </section>

      <div className="grid gap-2">
        <button
          type="button"
          onClick={closeWeek}
          disabled={isWorking || !week}
          className="h-11 rounded-md bg-amber-600 px-4 text-sm font-bold text-white disabled:opacity-60"
        >
          Haftayı Kapat
        </button>
        <button
          type="button"
          onClick={reopenWeek}
          disabled={isWorking || !week}
          className="h-11 rounded-md bg-teal-700 px-4 text-sm font-bold text-white disabled:opacity-60"
        >
          Haftayı Tekrar Aç
        </button>
        <button
          type="button"
          onClick={recalculateScores}
          disabled={isWorking || !week}
          className="h-11 rounded-md bg-slate-900 px-4 text-sm font-bold text-white disabled:opacity-60"
        >
          Puanları Hesapla
        </button>
      </div>

      <section className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-teal-700">Maç Sonuçları</p>
          <h2 className="mt-1 text-lg font-bold text-slate-950">Resmi sonuç girişi</h2>
        </div>

        {matches.map((match) => (
          <article
            key={match.id}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-bold uppercase tracking-normal text-slate-400">
              Maç {match.position}
            </p>
            <h3 className="mt-1 text-base font-bold text-slate-950">
              {match.home_team} - {match.away_team}
            </h3>
            <label className="mt-3 block">
              <span className="text-sm font-semibold text-slate-600">Resmi sonuç</span>
              <select
                value={results[match.id] || ""}
                onChange={(event) =>
                  setResults((current) => ({
                    ...current,
                    [match.id]: event.target.value as Result,
                  }))
                }
                className="mt-2 h-11 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-800 outline-none focus:border-teal-600"
              >
                {resultOptions.map((option) => (
                  <option key={option.value || "empty"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </article>
        ))}

        <button
          type="button"
          onClick={saveResults}
          disabled={isWorking || matches.length === 0}
          className="h-12 w-full rounded-md bg-teal-700 px-4 text-sm font-bold text-white shadow-sm disabled:opacity-60"
        >
          Sonuçları Kaydet
        </button>
      </section>
    </AdminShell>
  );
}

function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <header>
        <p className="text-sm font-semibold text-teal-700">Admin</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-950">Hafta yönetimi</h1>
      </header>
      {children}
    </div>
  );
}

function InfoCard({ text }: { text: string }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm leading-6 text-slate-600">{text}</p>
    </section>
  );
}

function StatusMessage({ message }: { message: Message }) {
  const style =
    message.type === "success"
      ? "border-teal-200 bg-teal-50 text-teal-800"
      : "border-red-200 bg-red-50 text-red-800";

  return <p className={`rounded-md border px-3 py-2 text-sm font-semibold ${style}`}>{message.text}</p>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
