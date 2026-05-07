import type { ParsedSporTotoMatch } from "@/lib/spor-toto/parse-pasted-list";

type ParseSuccess = {
  success: true;
  weekNameSuggestion: string | null;
  matches: ParsedSporTotoMatch[];
};

type ParseFailure = {
  success: false;
  errors: string[];
};

export type ParseOfficialMatchesResult = ParseSuccess | ParseFailure;

type OfficialResponse = {
  isSucceed?: unknown;
  object?: unknown;
};

type OfficialMatchItem = {
  gameRoundName?: unknown;
  match?: {
    date?: unknown;
    homeTeam?: { name?: unknown };
    awayTeam?: { name?: unknown };
  };
};

export function parseOfficialMatches(input: unknown): ParseOfficialMatchesResult {
  const response = input as OfficialResponse;
  const errors: string[] = [];

  if (response?.isSucceed === false) {
    errors.push("Resmî API başarılı bir yanıt döndürmedi.");
  }

  if (!Array.isArray(response?.object)) {
    return { success: false, errors: ["Resmî API yanıtında maç listesi bulunamadı."] };
  }

  if (response.object.length !== 15) {
    errors.push("Resmî API tam olarak 15 maç döndürmeli.");
  }

  const items = response.object as OfficialMatchItem[];
  const matches = items.map((item, index) => {
    const lineNumber = index + 1;
    const homeTeam = readString(item.match?.homeTeam?.name);
    const awayTeam = readString(item.match?.awayTeam?.name);
    const date = readString(item.match?.date);

    if (!homeTeam) {
      errors.push(`${lineNumber}. maçta ev sahibi takım bulunamadı.`);
    }

    if (!awayTeam) {
      errors.push(`${lineNumber}. maçta deplasman takımı bulunamadı.`);
    }

    if (date && Number.isNaN(new Date(date).getTime())) {
      errors.push(`${lineNumber}. maçta geçersiz maç tarihi var.`);
    }

    return {
      position: index + 1,
      home_team: homeTeam,
      away_team: awayTeam,
      starts_at: date || null,
    };
  });

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    weekNameSuggestion: readString(items[0]?.gameRoundName) || null,
    matches,
  };
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
