"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import {
  parsePastedSporTotoList,
  type ParsedSporTotoMatch,
} from "@/lib/spor-toto/parse-pasted-list";
import type { ParsedOfficialResultRow } from "@/lib/spor-toto/parse-official-results";
import type { ParsedOfficialRound } from "@/lib/spor-toto/parse-official-rounds";
import { TeamNameWithLogo } from "@/components/team-name-with-logo";

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
  home_external_team_id: number | null;
  away_external_team_id: number | null;
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
  const [importText, setImportText] = useState("");
  const [importWeekName, setImportWeekName] = useState("");
  const [importWeekNumber, setImportWeekNumber] = useState("");
  const [importOpensAt, setImportOpensAt] = useState("");
  const [importClosesAt, setImportClosesAt] = useState("");
  const [importPreview, setImportPreview] = useState<ParsedSporTotoMatch[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [officialGameRoundId, setOfficialGameRoundId] = useState("");
  const [isFetchingOfficial, setIsFetchingOfficial] = useState(false);
  const [officialResultGameRoundId, setOfficialResultGameRoundId] = useState("");
  const [isFetchingOfficialResults, setIsFetchingOfficialResults] = useState(false);
  const [officialResultPreview, setOfficialResultPreview] = useState<ParsedOfficialResultRow[]>([]);
  const [officialResultDrafts, setOfficialResultDrafts] = useState<Record<number, Result>>({});
  const [officialResultErrors, setOfficialResultErrors] = useState<string[]>([]);
  const [officialResultWarnings, setOfficialResultWarnings] = useState<string[]>([]);
  const [roundYear, setRoundYear] = useState("2025/2026");
  const [isFetchingRounds, setIsFetchingRounds] = useState(false);
  const [officialRounds, setOfficialRounds] = useState<ParsedOfficialRound[]>([]);
  const [roundErrors, setRoundErrors] = useState<string[]>([]);
  const [roundWarnings, setRoundWarnings] = useState<string[]>([]);

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
      .select("id, position, home_team, away_team, home_external_team_id, away_external_team_id, starts_at, official_result")
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
        home_external_team_id: null,
        away_external_team_id: null,
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

  function previewImportList() {
    const result = parsePastedSporTotoList(importText);

    if (!result.success) {
      setImportPreview([]);
      setImportErrors(result.errors);
      return;
    }

    setImportPreview(result.matches);
    setImportErrors([]);
  }

  async function previewOfficialList() {
    if (!/^[1-9]\d*$/.test(officialGameRoundId)) {
      setImportPreview([]);
      setImportErrors(["gameRoundId pozitif bir sayı olmalı."]);
      return;
    }

    setIsFetchingOfficial(true);
    setImportErrors([]);

    try {
      const response = await fetch(
        `/api/spor-toto/matches?gameRoundId=${encodeURIComponent(officialGameRoundId)}`,
      );
      const payload = (await response.json()) as {
        ok: boolean;
        weekNameSuggestion?: string | null;
        matches?: ParsedSporTotoMatch[];
        errors?: string[];
      };

      if (!response.ok || !payload.ok || !payload.matches) {
        setImportPreview([]);
        setImportErrors(payload.errors || ["Resmî liste önizlenemedi."]);
        return;
      }

      setImportPreview(payload.matches);
      setImportErrors([]);

      if (!importWeekName.trim() && payload.weekNameSuggestion) {
        setImportWeekName(payload.weekNameSuggestion);
      }
    } catch {
      setImportPreview([]);
      setImportErrors(["Resmî liste kontrol edilirken bağlantı hatası oluştu."]);
    } finally {
      setIsFetchingOfficial(false);
    }
  }

  async function fetchOfficialRounds() {
    setIsFetchingRounds(true);
    setRoundErrors([]);
    setRoundWarnings([]);

    try {
      const response = await fetch(
        `/api/spor-toto/rounds?year=${encodeURIComponent(roundYear)}&isPublished=true`,
      );
      const payload = (await response.json()) as {
        ok: boolean;
        rounds?: ParsedOfficialRound[];
        warnings?: string[];
        errors?: string[];
      };

      if (!response.ok || !payload.ok || !payload.rounds) {
        setOfficialRounds([]);
        setRoundErrors(payload.errors || ["Yayınlanmış haftalar getirilemedi."]);
        return;
      }

      setOfficialRounds(payload.rounds);
      setRoundWarnings(payload.warnings || []);
    } catch {
      setOfficialRounds([]);
      setRoundErrors(["Yayınlanmış haftalar getirilirken bağlantı hatası oluştu."]);
    } finally {
      setIsFetchingRounds(false);
    }
  }

  function selectOfficialRound(gameRoundIdValue: string) {
    const selectedRound = officialRounds.find(
      (round) => String(round.gameRoundId) === gameRoundIdValue,
    );

    if (!selectedRound) {
      return;
    }

    const idValue = String(selectedRound.gameRoundId);
    setOfficialGameRoundId(idValue);
    setOfficialResultGameRoundId(idValue);

    if (!importWeekName.trim()) {
      setImportWeekName(formatRoundName(selectedRound));
    }
  }

  async function previewOfficialResults() {
    if (!/^[1-9]\d*$/.test(officialResultGameRoundId)) {
      setOfficialResultPreview([]);
      setOfficialResultErrors(["gameRoundId pozitif bir sayı olmalı."]);
      setOfficialResultWarnings([]);
      return;
    }

    setIsFetchingOfficialResults(true);
    setOfficialResultErrors([]);
    setOfficialResultWarnings([]);

    try {
      const response = await fetch(
        `/api/spor-toto/results?gameRoundId=${encodeURIComponent(officialResultGameRoundId)}`,
      );
      const payload = (await response.json()) as {
        ok: boolean;
        results?: ParsedOfficialResultRow[];
        warnings?: string[];
        errors?: string[];
      };

      if (!response.ok || !payload.ok || !payload.results) {
        setOfficialResultPreview([]);
        setOfficialResultErrors(payload.errors || ["Resmî sonuçlar önizlenemedi."]);
        return;
      }

      const teamWarnings = buildTeamMismatchWarnings(payload.results, matches);
      setOfficialResultPreview(payload.results);
      setOfficialResultDrafts(
        payload.results.reduce<Record<number, Result>>((current, row) => {
          current[row.position] = row.official_result || "";
          return current;
        }, {}),
      );
      setOfficialResultWarnings([...(payload.warnings || []), ...teamWarnings]);
      setOfficialResultErrors([]);
    } catch {
      setOfficialResultPreview([]);
      setOfficialResultErrors(["Resmî sonuçlar kontrol edilirken bağlantı hatası oluştu."]);
    } finally {
      setIsFetchingOfficialResults(false);
    }
  }

  async function applyOfficialResults() {
    if (officialResultPreview.length === 0) {
      setOfficialResultErrors(["Önce resmî sonuçları önizle."]);
      return;
    }

    setIsWorking(true);
    setMessage(null);

    const supabase = createClient();
    const responses = await Promise.all(
      matches.map((match) =>
        supabase
          .from("matches")
          .update({ official_result: officialResultDrafts[match.position] || null })
          .eq("id", match.id),
      ),
    );
    const error = responses.find((response) => response.error)?.error;

    setIsWorking(false);

    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }

    setResults((current) => {
      const nextResults = { ...current };

      matches.forEach((match) => {
        nextResults[match.id] = officialResultDrafts[match.position] || "";
      });

      return nextResults;
    });
    setMatches((current) =>
      current.map((match) => ({
        ...match,
        official_result: officialResultDrafts[match.position] || null,
      })),
    );
    setMessage({
      type: "success",
      text: "Resmî sonuçlar uygulandı. Puanları hesaplamak için Puanları Hesapla butonuna bas.",
    });
  }

  async function createImportedWeek() {
    if (!season) {
      setMessage({ type: "error", text: "Aktif sezon bulunamadı." });
      return;
    }

    if (importPreview.length !== 15) {
      setImportErrors(["Önce geçerli bir 15 maçlık liste önizle."]);
      return;
    }

    const validationError = validateWeekFields(
      importWeekName,
      importWeekNumber,
      importOpensAt,
      importClosesAt,
    );

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
        week_number: Number(importWeekNumber),
        name: importWeekName.trim(),
        opens_at: new Date(importOpensAt).toISOString(),
        closes_at: new Date(importClosesAt).toISOString(),
      })
      .select("id")
      .single();

    if (weekError || !createdWeek) {
      setIsWorking(false);
      setMessage({
        type: "error",
        text:
          weekError?.code === "23505"
            ? "Bu sezon için bu hafta numarası zaten var."
            : weekError?.message || "Hafta oluşturulamadı.",
      });
      return;
    }

    const { error: matchesError } = await supabase.from("matches").insert(
      importPreview.map((match) => ({
        week_id: createdWeek.id,
        position: match.position,
        home_team: match.home_team,
        away_team: match.away_team,
        home_external_team_id: match.home_external_team_id ?? null,
        away_external_team_id: match.away_external_team_id ?? null,
        starts_at: match.starts_at ? new Date(match.starts_at).toISOString() : null,
        official_result: null,
      })),
    );

    setIsWorking(false);

    if (matchesError) {
      setMessage({ type: "error", text: matchesError.message });
      return;
    }

    setImportText("");
    setImportWeekName("");
    setImportWeekNumber("");
    setImportOpensAt("");
    setImportClosesAt("");
    setImportPreview([]);
    setImportErrors([]);
    setMessage({ type: "success", text: "Önizlenen listeyle yeni hafta oluşturuldu." });
    await loadActiveWeek();
  }

  function validateNewWeek() {
    const fieldError = validateWeekFields(newWeekName, newWeekNumber, newOpensAt, newClosesAt);

    if (fieldError) {
      return fieldError;
    }

    const missingMatch = newMatches.find(
      (match) => !match.home_team.trim() || !match.away_team.trim(),
    );

    if (missingMatch) {
      return "15 maçın tamamı için ev sahibi ve deplasman gerekli.";
    }

    return "";
  }

  function validateWeekFields(name: string, weekNumberValue: string, opensAt: string, closesAt: string) {
    if (!name.trim()) {
      return "Hafta adı gerekli.";
    }

    const weekNumber = Number(weekNumberValue);

    if (!weekNumberValue || !Number.isInteger(weekNumber) || weekNumber <= 0) {
      return "Hafta numarası pozitif bir sayı olmalı.";
    }

    if (!opensAt) {
      return "Tahmin açılış zamanı gerekli.";
    }

    if (!closesAt) {
      return "Tahmin kapanış zamanı gerekli.";
    }

    if (new Date(closesAt) <= new Date(opensAt)) {
      return "Tahmin kapanış zamanı açılıştan sonra olmalı.";
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
      <AdminSectionNav />

      <section id="admin-hafta" className="scroll-mt-28 space-y-4">
        <div>
          <p className="text-sm font-semibold text-teal-700">Aktif Hafta</p>
          <h2 className="mt-1 text-xl font-bold text-slate-950">Hafta durumu</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Aktif sezonun en yüksek hafta numarasına sahip haftasını yönet.
          </p>
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
        </div>
      </section>

      <section id="admin-mac-listesi" className="scroll-mt-28">
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
        <BackToAdminTop />
      </section>

      <section id="admin-sonuclar" className="scroll-mt-28 space-y-4">
        <OfficialResultsImportSection
          matches={matches}
          isWorking={isWorking}
          gameRoundId={officialResultGameRoundId}
          isFetching={isFetchingOfficialResults}
          preview={officialResultPreview}
          drafts={officialResultDrafts}
          errors={officialResultErrors}
          warnings={officialResultWarnings}
          setGameRoundId={setOfficialResultGameRoundId}
          setDrafts={setOfficialResultDrafts}
          previewOfficialResults={previewOfficialResults}
          applyOfficialResults={applyOfficialResults}
        />
        <BackToAdminTop />
      </section>

      <section id="admin-puan" className="scroll-mt-28 space-y-3">
        <div>
          <p className="text-sm font-semibold text-teal-700">Puan</p>
          <h2 className="mt-1 text-xl font-bold text-slate-950">Skor hesaplama</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Resmî sonuçları kaydettikten sonra haftalık ve sezon puanlarını hesapla.
          </p>
        </div>
        <button
          type="button"
          onClick={recalculateScores}
          disabled={isWorking || !week}
          className="h-11 w-full rounded-md bg-slate-900 px-4 text-sm font-bold text-white disabled:opacity-60"
        >
          Puanları Hesapla
        </button>
      </section>

      <section id="admin-ice-aktar" className="scroll-mt-28">
        <ImportPreviewSection
          isWorking={isWorking}
          importText={importText}
          importWeekName={importWeekName}
          importWeekNumber={importWeekNumber}
          importOpensAt={importOpensAt}
          importClosesAt={importClosesAt}
          preview={importPreview}
          errors={importErrors}
          setImportText={setImportText}
          setImportWeekName={setImportWeekName}
          setImportWeekNumber={setImportWeekNumber}
          setImportOpensAt={setImportOpensAt}
          setImportClosesAt={setImportClosesAt}
          previewImportList={previewImportList}
          createImportedWeek={createImportedWeek}
        officialGameRoundId={officialGameRoundId}
        isFetchingOfficial={isFetchingOfficial}
        setOfficialGameRoundId={setOfficialGameRoundId}
        previewOfficialList={previewOfficialList}
        roundYear={roundYear}
        isFetchingRounds={isFetchingRounds}
        rounds={officialRounds}
        roundErrors={roundErrors}
        roundWarnings={roundWarnings}
        setRoundYear={setRoundYear}
        fetchOfficialRounds={fetchOfficialRounds}
        selectOfficialRound={selectOfficialRound}
      />
        <BackToAdminTop />
      </section>

      <section id="admin-yeni-hafta" className="scroll-mt-28">
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
        <BackToAdminTop />
      </section>
    </AdminShell>
  );
}

function AdminSectionNav() {
  const items = [
    { href: "#admin-hafta", label: "Hafta" },
    { href: "#admin-mac-listesi", label: "Maç Listesi" },
    { href: "#admin-sonuclar", label: "Sonuçlar" },
    { href: "#admin-puan", label: "Puan" },
    { href: "#admin-ice-aktar", label: "İçe Aktar" },
    { href: "#admin-yeni-hafta", label: "Yeni Hafta" },
  ];

  return (
    <nav
      id="admin-top"
      className="sticky top-0 z-10 -mx-4 border-y border-slate-200 bg-white/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6"
      aria-label="Admin bölümleri"
    >
      <div className="flex gap-2 overflow-x-auto">
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="flex h-10 shrink-0 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700"
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

function BackToAdminTop() {
  return (
    <a href="#admin-top" className="mt-3 inline-flex text-sm font-bold text-teal-700">
      Yukarı dön
    </a>
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
        <h2 className="mt-1 text-lg font-bold text-slate-950">Takım ve saat düzenleme</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Aktif haftadaki maçların takım adlarını, başlama saatlerini ve manuel sonuçlarını düzenle.
        </p>
      </div>

      {matches.map((match) => (
        <article
          key={match.id}
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
        >
          <p className="text-xs font-bold uppercase tracking-normal text-slate-400">
            Maç {match.position}
          </p>
          <div className="mt-2 space-y-1">
            <TeamNameWithLogo
              name={match.home_team}
              externalTeamId={match.home_external_team_id}
            />
            <TeamNameWithLogo
              name={match.away_team}
              externalTeamId={match.away_external_team_id}
            />
          </div>
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

function OfficialResultsImportSection({
  matches,
  isWorking,
  gameRoundId,
  isFetching,
  preview,
  drafts,
  errors,
  warnings,
  setGameRoundId,
  setDrafts,
  previewOfficialResults,
  applyOfficialResults,
}: {
  matches: Match[];
  isWorking: boolean;
  gameRoundId: string;
  isFetching: boolean;
  preview: ParsedOfficialResultRow[];
  drafts: Record<number, Result>;
  errors: string[];
  warnings: string[];
  setGameRoundId: (value: string) => void;
  setDrafts: React.Dispatch<React.SetStateAction<Record<number, Result>>>;
  previewOfficialResults: () => void;
  applyOfficialResults: () => void;
}) {
  const matchByPosition = new Map(matches.map((match) => [match.position, match]));

  return (
    <section className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-teal-700">Resmî Sonuçları İçe Aktar</p>
        <h2 className="mt-1 text-lg font-bold text-slate-950">Önizle, düzenle, uygula</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Sonuçlar, maçlar oynandıktan sonra resmî maç listesi endpointindeki fullTimeWin ve skor
          alanlarından okunur.
        </p>
      </div>

      <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <TextInput
          label="gameRoundId"
          type="number"
          value={gameRoundId}
          onChange={setGameRoundId}
          min="1"
          placeholder="1512"
        />
        <button
          type="button"
          onClick={previewOfficialResults}
          disabled={isWorking || isFetching}
          className="h-11 w-full rounded-md bg-teal-700 px-4 text-sm font-bold text-white disabled:opacity-60"
        >
          {isFetching ? "Resmî sonuçlar kontrol ediliyor..." : "Resmî Sonuçları Önizle"}
        </button>
      </section>

      {errors.length > 0 ? (
        <section className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-bold text-red-800">Sonuç önizleme hataları</p>
          <ul className="mt-2 space-y-1 text-sm text-red-700">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {warnings.length > 0 ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-800">Kontrol uyarıları</p>
          <ul className="mt-2 space-y-1 text-sm text-amber-700">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {preview.length > 0 ? (
        <section className="space-y-3">
          {preview.map((row) => {
            const localMatch = matchByPosition.get(row.position);

            return (
              <article
                key={row.position}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <p className="text-xs font-bold uppercase tracking-normal text-slate-400">
                  Maç {row.position}
                </p>
                <h3 className="mt-1 text-base font-bold text-slate-950">
                  {row.home_team || localMatch?.home_team || "Ev sahibi"} -{" "}
                  {row.away_team || localMatch?.away_team || "Deplasman"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Skor: {row.score || "-"} · Algılanan sonuç: {row.official_result || "Boş"}
                </p>
                <label className="mt-3 block">
                  <span className="text-sm font-semibold text-slate-600">Uygulanacak sonuç</span>
                  <select
                    value={drafts[row.position] || ""}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [row.position]: event.target.value as Result,
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
            );
          })}

          <button
            type="button"
            onClick={applyOfficialResults}
            disabled={isWorking}
            className="h-12 w-full rounded-md bg-teal-700 px-4 text-sm font-bold text-white shadow-sm disabled:opacity-60"
          >
            Resmî Sonuçları Uygula
          </button>
        </section>
      ) : null}
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

function ImportPreviewSection({
  isWorking,
  importText,
  importWeekName,
  importWeekNumber,
  importOpensAt,
  importClosesAt,
  preview,
  errors,
  setImportText,
  setImportWeekName,
  setImportWeekNumber,
  setImportOpensAt,
  setImportClosesAt,
  previewImportList,
  createImportedWeek,
  officialGameRoundId,
  isFetchingOfficial,
  setOfficialGameRoundId,
  previewOfficialList,
  roundYear,
  isFetchingRounds,
  rounds,
  roundErrors,
  roundWarnings,
  setRoundYear,
  fetchOfficialRounds,
  selectOfficialRound,
}: {
  isWorking: boolean;
  importText: string;
  importWeekName: string;
  importWeekNumber: string;
  importOpensAt: string;
  importClosesAt: string;
  preview: ParsedSporTotoMatch[];
  errors: string[];
  setImportText: (value: string) => void;
  setImportWeekName: (value: string) => void;
  setImportWeekNumber: (value: string) => void;
  setImportOpensAt: (value: string) => void;
  setImportClosesAt: (value: string) => void;
  previewImportList: () => void;
  createImportedWeek: () => void;
  officialGameRoundId: string;
  isFetchingOfficial: boolean;
  setOfficialGameRoundId: (value: string) => void;
  previewOfficialList: () => void;
  roundYear: string;
  isFetchingRounds: boolean;
  rounds: ParsedOfficialRound[];
  roundErrors: string[];
  roundWarnings: string[];
  setRoundYear: (value: string) => void;
  fetchOfficialRounds: () => void;
  selectOfficialRound: (gameRoundIdValue: string) => void;
}) {
  return (
    <section className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-teal-700">Spor Toto Listesi İçe Aktar</p>
        <h2 className="mt-1 text-xl font-bold text-slate-950">Önizle ve onayla</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Resmî Spor Toto listesini önce önizle, sonra onaylarsan yeni hafta olarak kaydet.
        </p>
      </div>

      <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <p className="text-sm font-bold text-slate-900">Yayınlanmış Haftaları Getir</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Resmî listeden yayınlanmış haftaları getirip gameRoundId alanlarını otomatik doldur.
          </p>
        </div>
        <TextInput label="Sezon yılı" value={roundYear} onChange={setRoundYear} placeholder="2025/2026" />
        <button
          type="button"
          onClick={fetchOfficialRounds}
          disabled={isWorking || isFetchingRounds}
          className="h-11 w-full rounded-md bg-slate-900 px-4 text-sm font-bold text-white disabled:opacity-60"
        >
          {isFetchingRounds ? "Yayınlanmış haftalar getiriliyor..." : "Haftaları Getir"}
        </button>

        {roundErrors.length > 0 ? (
          <MessageList title="Hafta listesi hataları" messages={roundErrors} tone="error" />
        ) : null}

        {roundWarnings.length > 0 ? (
          <MessageList title="Hafta listesi uyarıları" messages={roundWarnings} tone="warning" />
        ) : null}

        {rounds.length > 0 ? (
          <label className="block">
            <span className="text-sm font-semibold text-slate-600">Yayınlanmış hafta seç</span>
            <select
              defaultValue=""
              onChange={(event) => selectOfficialRound(event.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-800 outline-none focus:border-teal-600"
            >
              <option value="" disabled>
                Hafta seç
              </option>
              {rounds.map((round) => (
                <option key={round.gameRoundId} value={round.gameRoundId}>
                  {formatRoundName(round)} — ID: {round.gameRoundId}
                  {round.closeDate ? ` — ${formatDate(round.closeDate)}` : ""}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </section>

      <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <p className="text-sm font-bold text-slate-900">Resmî API’den Liste Çek</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            gameRoundId girerek resmî listeden 15 maçı önizle. Kaydetme işlemi yine admin onayı
            ister.
          </p>
        </div>
        <TextInput
          label="gameRoundId"
          type="number"
          value={officialGameRoundId}
          onChange={setOfficialGameRoundId}
          min="1"
          placeholder="1512"
        />
        <button
          type="button"
          onClick={previewOfficialList}
          disabled={isWorking || isFetchingOfficial}
          className="h-11 w-full rounded-md bg-teal-700 px-4 text-sm font-bold text-white disabled:opacity-60"
        >
          {isFetchingOfficial ? "Resmî liste kontrol ediliyor..." : "Resmî Listeden Önizle"}
        </button>
      </section>

      <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <label className="block">
          <span className="text-sm font-semibold text-slate-600">Yapıştırılan liste</span>
          <textarea
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
            rows={8}
            className="mt-2 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-teal-600"
          />
        </label>
        <p className="text-xs leading-5 text-slate-500">
          Desteklenen format: `1;Galatasaray;Fenerbahçe;2026-05-08T20:00`
          satır satır 15 maç. Maç zamanı isteğe bağlıdır.
        </p>
        <button
          type="button"
          onClick={previewImportList}
          disabled={isWorking}
          className="h-11 w-full rounded-md bg-slate-900 px-4 text-sm font-bold text-white disabled:opacity-60"
        >
          Listeyi Önizle
        </button>
      </section>

      {errors.length > 0 ? (
        <section className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-bold text-red-800">Önizleme hataları</p>
          <ul className="mt-2 space-y-1 text-sm text-red-700">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {preview.length > 0 ? (
        <section className="space-y-3">
          <div className="rounded-lg border border-teal-200 bg-teal-50 p-4">
            <p className="text-sm font-bold text-teal-800">15 maç başarıyla önizlendi.</p>
          </div>
          {preview.map((match) => (
            <article
              key={match.position}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <p className="text-xs font-bold uppercase tracking-normal text-slate-400">
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
              <p className="mt-1 text-sm text-slate-500">
                {match.starts_at ? formatDate(match.starts_at) : "Maç zamanı yok"}
              </p>
            </article>
          ))}
        </section>
      ) : null}

      <section className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <TextInput label="Hafta adı" value={importWeekName} onChange={setImportWeekName} placeholder="2. Hafta" />
        <TextInput
          label="Hafta numarası"
          type="number"
          value={importWeekNumber}
          onChange={setImportWeekNumber}
          min="1"
        />
        <TextInput
          label="Tahmin açılış zamanı"
          type="datetime-local"
          value={importOpensAt}
          onChange={setImportOpensAt}
        />
        <TextInput
          label="Tahmin kapanış zamanı"
          type="datetime-local"
          value={importClosesAt}
          onChange={setImportClosesAt}
        />
        <button
          type="button"
          onClick={createImportedWeek}
          disabled={isWorking || preview.length !== 15}
          className="h-12 w-full rounded-md bg-teal-700 px-4 text-sm font-bold text-white shadow-sm disabled:opacity-60"
        >
          Önizlenen Listeyle Hafta Oluştur
        </button>
      </section>

      <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-bold text-slate-800">Resmî siteden otomatik çekme</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Otomatik zamanlanmış import ve sonuç çekme henüz aktif değil. Resmî API değişirse bu
          önizleme akışı da güncellenmelidir.
        </p>
      </section>
    </section>
  );
}

function MessageList({
  title,
  messages,
  tone,
}: {
  title: string;
  messages: string[];
  tone: "error" | "warning";
}) {
  const styles =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <section className={`rounded-lg border p-4 ${styles}`}>
      <p className="text-sm font-bold">{title}</p>
      <ul className="mt-2 space-y-1 text-sm">
        {messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </section>
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

function buildTeamMismatchWarnings(importedRows: ParsedOfficialResultRow[], localMatches: Match[]) {
  const matchByPosition = new Map(localMatches.map((match) => [match.position, match]));
  const warnings: string[] = [];

  importedRows.forEach((row) => {
    const localMatch = matchByPosition.get(row.position);

    if (!localMatch || !row.home_team || !row.away_team) {
      return;
    }

    const localLabel = normalizeTeamLabel(`${localMatch.home_team} ${localMatch.away_team}`);
    const importedLabel = normalizeTeamLabel(`${row.home_team} ${row.away_team}`);

    if (localLabel !== importedLabel) {
      warnings.push(
        `${row.position}. maç takım adları farklı görünüyor: API "${row.home_team} - ${row.away_team}", aktif hafta "${localMatch.home_team} - ${localMatch.away_team}".`,
      );
    }
  });

  return warnings;
}

function normalizeTeamLabel(value: string) {
  return value.toLocaleLowerCase("tr-TR").replace(/\s+/g, " ").trim();
}

function formatRoundName(round: ParsedOfficialRound) {
  return [round.year, round.name].filter(Boolean).join(" ");
}
