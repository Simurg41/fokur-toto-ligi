type OfficialResult = "1" | "X" | "2" | "void" | null;

export type ParsedOfficialResultRow = {
  position: number;
  home_team?: string;
  away_team?: string;
  score?: string;
  official_result: OfficialResult;
};

type ParseSuccess = {
  success: true;
  weekNameSuggestion?: string;
  results: ParsedOfficialResultRow[];
  warnings: string[];
};

type ParseFailure = {
  success: false;
  errors: string[];
};

export type ParseOfficialResultsResult = ParseSuccess | ParseFailure;

type OfficialResponse = {
  object?: unknown;
  isSucceed?: unknown;
};

type OfficialMatchEntry = {
  gameRoundName?: unknown;
  match?: {
    fullTimeWin?: unknown;
    homeTeam?: { name?: unknown };
    awayTeam?: { name?: unknown };
    score?: {
      homeRegular?: unknown;
      awayRegular?: unknown;
      homeCurrent?: unknown;
      awayCurrent?: unknown;
    } | null;
  } | null;
};

type OfficialScore = NonNullable<NonNullable<OfficialMatchEntry["match"]>["score"]>;

export function parseOfficialResults(input: unknown): ParseOfficialResultsResult {
  const response = input as OfficialResponse;
  const errors: string[] = [];
  const warnings: string[] = [];

  if (response?.isSucceed === false) {
    errors.push("Resmî API maç listesi isteği başarılı değil.");
  }

  if (!Array.isArray(response?.object)) {
    errors.push("Resmî API yanıtında maç listesi bulunamadı.");
  }

  if (errors.length > 0 || !Array.isArray(response?.object)) {
    return { success: false, errors };
  }

  if (response.object.length !== 15) {
    warnings.push(`Resmî API ${response.object.length} maç döndürdü; ilk 15 maç okunacak.`);
  }

  const rows = (response.object as OfficialMatchEntry[]).slice(0, 15);
  const results = rows.map((entry, index) => {
    const position = index + 1;
    const match = entry.match;
    const homeTeam = readString(match?.homeTeam?.name);
    const awayTeam = readString(match?.awayTeam?.name);
    const score = formatScore(match?.score);
    const officialResult = resultFromFullTimeWin(match?.fullTimeWin) || resultFromScore(match?.score);

    if (!match) {
      warnings.push(`${position}. maç için maç verisi bulunamadı.`);
    }

    if (!homeTeam || !awayTeam) {
      warnings.push(`${position}. maç için takım bilgisi eksik.`);
    }

    if (!officialResult) {
      warnings.push(`${position}. maç için sonuç henüz açıklanmamış olabilir.`);
    }

    return {
      position,
      home_team: homeTeam || undefined,
      away_team: awayTeam || undefined,
      score: score || undefined,
      official_result: officialResult,
    };
  });

  if (results.length === 0) {
    return { success: false, errors: ["Resmî API yanıtında okunabilir maç verisi bulunamadı."] };
  }

  return {
    success: true,
    weekNameSuggestion: readString(rows[0]?.gameRoundName) || undefined,
    results,
    warnings,
  };
}

function resultFromFullTimeWin(value: unknown): OfficialResult {
  if (value === 1 || value === "1") {
    return "1";
  }

  if (value === 0 || value === "0") {
    return "X";
  }

  if (value === 2 || value === "2") {
    return "2";
  }

  return null;
}

function resultFromScore(score: OfficialScore | null | undefined): OfficialResult {
  const homeScore = readNumber(score?.homeRegular);
  const awayScore = readNumber(score?.awayRegular);

  if (homeScore === null || awayScore === null) {
    return null;
  }

  if (homeScore > awayScore) {
    return "1";
  }

  if (homeScore === awayScore) {
    return "X";
  }

  return "2";
}

function formatScore(score: OfficialScore | null | undefined) {
  const homeRegular = readNumber(score?.homeRegular);
  const awayRegular = readNumber(score?.awayRegular);

  if (homeRegular !== null && awayRegular !== null) {
    return `${homeRegular}-${awayRegular}`;
  }

  const homeCurrent = readNumber(score?.homeCurrent);
  const awayCurrent = readNumber(score?.awayCurrent);

  if (homeCurrent !== null && awayCurrent !== null) {
    return `${homeCurrent}-${awayCurrent}`;
  }

  return "";
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
  }

  return null;
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
