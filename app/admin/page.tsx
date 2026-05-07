"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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
  starts_at: string | null;
  official_result: Result | null;
};

type MatchDraft = {
  home_team: string;
  away_team: string;
  starts_at: string;
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

const emptyMatchDrafts = Array.from({ length: 15 }, () => ({
  home_team: "",
  away_team: "",
  starts_at: "",
}));

export default function AdminPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [season, setSeason] = useState<Season | null>(null);
  const [week, setWeek] = useState<Week | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [results, setResults] = useState<Record<string, Result>>({});
  const [matchDrafts, setMatchDrafts] = useState<Record<string, MatchDraft>>({});
  const [message, setMessage] = useState<Message | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [newWeekName, setNewWeekName] = useState("");
  const [newWeekNumber, setNewWeekNumber] = useState("");
  const [newOpensAt, setNewOpensAt] = useState("");
  const [newClosesAt, setNewClosesAt] = useState("");
  const [newMatches, setNewMatches] = useState<MatchDraft[]>(emptyMatchDrafts);

  const predictionsAreOpen = useMemo(() => {
    if (!week) {
      return false;
    }

    const now = new Date();
    return now >= new Date(week.opens_at) && now < new Date(week.closes_at);
  }, [week]);

  useEffect(() => {
    let isMounted = true;

    async function bootAdminPage() {
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
      await loadActiveWeek();

      if (isMounted) {
        setIsLoading(false);
      }
    }

    bootAdminPage();

    return () => {
      isMounted = false;
    };
  }, [router]);

  async function loadActiveWeek() {
    const supabase = createClient();

    const { data: seasonData, error: seasonError } = await supabase
      .from("seasons")
      .select("id, name")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (seasonError || !seasonData) {
      setSeason(null);
      setWeek(null);
      setMatches([]);
      setMessage({ type: "error", text: seasonError?.message || "Aktif sezon bulunamadı." });
      return;
    }

    setSeason(seasonData as Season);

    // The current week is always the highest week_number in the active season.
    const { data: weekData, error: weekError } = await supabase
      .from("weeks")
      .select("id, name, week_number, opens_at, closes_at")
      .eq("season_id", seasonData.id)
      .order("week_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (weekError || !weekData) {
      setWeek(null);
      setMatches([]);
      setMessage({ type: "error", text: weekError?.message || "Hafta bulunamadı." });
      return;
    }

    setWeek(weekData as Week);

    const { data: matchData, error: matchError } = await supabase
      .from("matches")
      .select("id, position, home_team, away_team, starts_at, official_result")
      .eq("week_id", weekData.id)
      .order("position", { ascending: true });

    if (matchError) {
      setMessage({ type: "error", text: matchError.message });
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
    setMatchDrafts(
      loadedMatches.reduce<Record<string, MatchDraft>>((current, match) => {
        current[match.id] = {
          home_team: match.home_team,
          away_team: match.away_team,
          starts_at: toDateTimeLocalValue(match.starts_at),
        };
        return current;
      }, {}),
    );
  }

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

  async function saveMatchList() {
    setIsWorking(true);
    setMessage(null);

    const invalidMatch = matches.find((match) => {
      const draft = matchDrafts[match.id];
      return !draft?.home_team.trim() || !draft?.away_team.trim();
    });

    if (invalidMatch) {
      setIsWorking(false);
      setMessage({ type: "error", text: "Tüm maçlar için ev sahibi ve deplasman gerekli." });
      return;
    }

    const supabase = createClient();
    const responses = await Promise.all(
      matches.map((match) => {
        const draft = matchDrafts[match.id];
        return supabase
          .from("matches")
          .update({
            home_team: draft.home_team.trim(),
            away_team: draft.away_team.trim(),
            starts_at: draft.starts_at ? new Date(draft.starts_at).toISOString() : null,
          })
          .eq("id", match.id);
      }),
    );
    const error = responses.find((response) => response.error)?.error;

    setIsWorking(false);

    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }

    setMessage({ type: "success", text: "Maç listesi kaydedildi." });
    await loadActiveWeek();
  }

  async function saveResults() {
    setIsWorking(true);
    setMessage(null);

    const supabase = createClient();
    const responses = await Promise.all(
      matches.map((match) =>
        supabase
          .from("matches")
          .update({ official_result: results[match.id] || null })
          .eq("id", match.id),
      ),
    );
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

  async function createWeek(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!season) {
      setMessage({ type: "error", text: "Aktif sezon bulunamadı." });
      return;
    }

    const validationError = validateNewWeek();

    if (validationError) {
      setMessage({ type: "error", text: validationError });
      return;
    }

    setIsWorking(true);
    setMessage(null);

    const supabase = createClient();
    const { data: createdWeek, error: weekError } = await supabase
      .from("weeks")
      .insert({
        season_id: season.id,
        week_number: Number(newWeekNumber),
        name: newWeekName.trim(),
        opens_at: new Date(newOpensAt).toISOString(),
        closes_at: new Date(newClosesAt).toISOString(),
      })
      .select("id")
      .single();

    if (weekError || !createdWeek) {
      setIsWorking(false);
      const isDuplicate = weekError?.code === "23505";
      setMessage({
        type: "error",
        text: isDuplicate
          ? "Bu sezon için bu hafta numarası zaten var."
          : weekError?.message || "Hafta oluşturulamadı.",
      });
      return;
    }

    const { error: matchesError } = await supabase.from("matches").insert(
      newMatches.map((match, index) => ({
        week_id: createdWeek.id,
        position: index + 1,
        home_team: match.home_team.trim(),
        away_team: match.away_team.trim(),
        starts_at: match.starts_at ? new Date(match.starts_at).toISOString() : null,
        official_result: null,
      })),
    );

    setIsWorking(false);

    if (matchesError) {
      setMessage({ type: "error", text: matchesError.message });
      return;
    }

    setNewWeekName("");
    setNewWeekNumber("");
    setNewOpensAt("");
    setNewClosesAt("");
    setNewMatches(emptyMatchDrafts);
    setMessage({ type: "success", text: "Yeni hafta oluşturuldu." });
    await loadActiveWeek();
  }

  function validateNewWeek() {
    if (!newWeekName.trim()) {
      return "Hafta adı gerekli.";
    }

    const weekNumber = Number(newWeekNumber);

    if (!newWeekNumber || !Number.isInteger(weekNumber) || weekNumber <= 0) {
      return "Hafta numarası pozitif bir sayı olmalı.";
    }

    if (!newOpensAt) {
      return "Tahmin açılış zamanı gerekli.";
    }

    if (!newClosesAt) {
      return "Tahmin kapanış zamanı gerekli.";
    }

    if (new Date(newClosesAt) <= new Date(newOpensAt)) {
      return "Tahmin kapanış zamanı açılıştan sonra olmalı.";
    }

    const missingMatch = newMatches.find(
      (match) => !match.home_team.trim() || !match.away_team.trim(),
    );

    if (missingMatch) {
      return "15 maçın tamamı için ev sahibi ve deplasman gerekli.";
    }

    return "";
  }

  if (isLoading) {
    return (
      <AdminShell>
        <InfoCard text="Admin paneli yükleniyor..." />
      </AdminShell>
    );
  }

  if (!isAdmin) {
    return (
      <AdminShell>
        <InfoCard text="Bu sayfaya erişim yetkin yok." />
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      {message ? <StatusMessage message={message} /> : null}

      <section className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-teal-700">Aktif Hafta Yönetimi</p>
          <h2 className="mt-1 text-xl font-bold text-slate-950">Son hafta</h2>
        </div>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">{season?.name || "Aktif sezon"}</p>
          <h3 className="mt-1 text-xl font-bold text-slate-950">
            {week?.name || (week ? `${week.week_number}. hafta` : "Hafta yok")}
          </h3>
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

        <MatchManagement
          matches={matches}
          matchDrafts={matchDrafts}
          results={results}
          isWorking={isWorking}
          setMatchDrafts={setMatchDrafts}
          setResults={setResults}
          saveMatchList={saveMatchList}
          saveResults={saveResults}
        />
      </section>

      <NewWeekForm
        isWorking={isWorking}
        newWeekName={newWeekName}
        newWeekNumber={newWeekNumber}
        newOpensAt={newOpensAt}
        newClosesAt={newClosesAt}
        newMatches={newMatches}
        setNewWeekName={setNewWeekName}
        setNewWeekNumber={setNewWeekNumber}
        setNewOpensAt={setNewOpensAt}
        setNewClosesAt={setNewClosesAt}
        setNewMatches={setNewMatches}
        createWeek={createWeek}
      />
    </AdminShell>
  );
}

function MatchManagement({
  matches,
  matchDrafts,
  results,
  isWorking,
  setMatchDrafts,
  setResults,
  saveMatchList,
  saveResults,
}: {
  matches: Match[];
  matchDrafts: Record<string, MatchDraft>;
  results: Record<string, Result>;
  isWorking: boolean;
  setMatchDrafts: React.Dispatch<React.SetStateAction<Record<string, MatchDraft>>>;
  setResults: React.Dispatch<React.SetStateAction<Record<string, Result>>>;
  saveMatchList: () => void;
  saveResults: () => void;
}) {
  return (
    <section className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-teal-700">Maç Listesi</p>
        <h2 className="mt-1 text-lg font-bold text-slate-950">Takım ve sonuç yönetimi</h2>
      </div>

      {matches.map((match) => (
        <article
          key={match.id}
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
        >
          <p className="text-xs font-bold uppercase tracking-normal text-slate-400">
            Maç {match.position}
          </p>
          <div className="mt-3 grid gap-3">
            <TextInput
              label="Ev sahibi"
              value={matchDrafts[match.id]?.home_team || ""}
              onChange={(value) =>
                setMatchDrafts((current) => ({
                  ...current,
                  [match.id]: { ...current[match.id], home_team: value },
                }))
              }
            />
            <TextInput
              label="Deplasman"
              value={matchDrafts[match.id]?.away_team || ""}
              onChange={(value) =>
                setMatchDrafts((current) => ({
                  ...current,
                  [match.id]: { ...current[match.id], away_team: value },
                }))
              }
            />
            <TextInput
              label="Maç zamanı"
              type="datetime-local"
              value={matchDrafts[match.id]?.starts_at || ""}
              onChange={(value) =>
                setMatchDrafts((current) => ({
                  ...current,
                  [match.id]: { ...current[match.id], starts_at: value },
                }))
              }
            />
            <label className="block">
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
          </div>
        </article>
      ))}

      <button
        type="button"
        onClick={saveMatchList}
        disabled={isWorking || matches.length === 0}
        className="h-12 w-full rounded-md bg-slate-900 px-4 text-sm font-bold text-white shadow-sm disabled:opacity-60"
      >
        Maç Listesini Kaydet
      </button>
      <button
        type="button"
        onClick={saveResults}
        disabled={isWorking || matches.length === 0}
        className="h-12 w-full rounded-md bg-teal-700 px-4 text-sm font-bold text-white shadow-sm disabled:opacity-60"
      >
        Sonuçları Kaydet
      </button>
    </section>
  );
}

function NewWeekForm({
  isWorking,
  newWeekName,
  newWeekNumber,
  newOpensAt,
  newClosesAt,
  newMatches,
  setNewWeekName,
  setNewWeekNumber,
  setNewOpensAt,
  setNewClosesAt,
  setNewMatches,
  createWeek,
}: {
  isWorking: boolean;
  newWeekName: string;
  newWeekNumber: string;
  newOpensAt: string;
  newClosesAt: string;
  newMatches: MatchDraft[];
  setNewWeekName: (value: string) => void;
  setNewWeekNumber: (value: string) => void;
  setNewOpensAt: (value: string) => void;
  setNewClosesAt: (value: string) => void;
  setNewMatches: React.Dispatch<React.SetStateAction<MatchDraft[]>>;
  createWeek: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={createWeek} className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-teal-700">Yeni Hafta Oluştur</p>
        <h2 className="mt-1 text-xl font-bold text-slate-950">15 maçlık liste</h2>
      </div>

      <section className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <TextInput label="Hafta adı" value={newWeekName} onChange={setNewWeekName} placeholder="2. Hafta" />
        <TextInput
          label="Hafta numarası"
          type="number"
          value={newWeekNumber}
          onChange={setNewWeekNumber}
          min="1"
        />
        <TextInput
          label="Tahmin açılış zamanı"
          type="datetime-local"
          value={newOpensAt}
          onChange={setNewOpensAt}
        />
        <TextInput
          label="Tahmin kapanış zamanı"
          type="datetime-local"
          value={newClosesAt}
          onChange={setNewClosesAt}
        />
      </section>

      <section className="space-y-3">
        {newMatches.map((match, index) => (
          <article
            key={index}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-bold uppercase tracking-normal text-slate-400">
              Maç {index + 1}
            </p>
            <div className="mt-3 grid gap-3">
              <TextInput
                label="Ev sahibi"
                value={match.home_team}
                onChange={(value) =>
                  setNewMatches((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, home_team: value } : item,
                    ),
                  )
                }
              />
              <TextInput
                label="Deplasman"
                value={match.away_team}
                onChange={(value) =>
                  setNewMatches((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, away_team: value } : item,
                    ),
                  )
                }
              />
              <TextInput
                label="Maç zamanı"
                type="datetime-local"
                value={match.starts_at}
                onChange={(value) =>
                  setNewMatches((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, starts_at: value } : item,
                    ),
                  )
                }
              />
            </div>
          </article>
        ))}
      </section>

      <button
        type="submit"
        disabled={isWorking}
        className="h-12 w-full rounded-md bg-teal-700 px-4 text-sm font-bold text-white shadow-sm disabled:opacity-60"
      >
        Yeni Haftayı Oluştur
      </button>
    </form>
  );
}

function TextInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  min,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  min?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-600">{label}</span>
      <input
        type={type}
        value={value}
        min={min}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-teal-600"
      />
    </label>
  );
}

function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
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

function toDateTimeLocalValue(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}
