export type ParsedOfficialRound = {
  gameRoundId: number;
  name: string;
  year?: string;
  closeDate?: string;
};

type ParseSuccess = {
  success: true;
  rounds: ParsedOfficialRound[];
  warnings: string[];
};

type ParseFailure = {
  success: false;
  errors: string[];
};

export type ParseOfficialRoundsResult = ParseSuccess | ParseFailure;

type OfficialResponse = {
  object?: unknown;
};

export function parseOfficialRounds(input: unknown): ParseOfficialRoundsResult {
  const response = input as OfficialResponse;
  const rows = findRows(response?.object);

  if (!rows) {
    return {
      success: false,
      errors: ["Resmî API yanıtında yayınlanmış hafta listesi bulunamadı."],
    };
  }

  const warnings: string[] = [];
  const rounds = rows
    .map<ParsedOfficialRound | null>((row, index) => {
      const gameRoundId = readNumber(row, ["id", "gameRoundId"]);

      if (!gameRoundId) {
        warnings.push(`${index + 1}. hafta satırında kullanılabilir ID bulunamadı.`);
        return null;
      }

      const parsedRound: ParsedOfficialRound = {
        gameRoundId,
        name:
          readString(row, ["name", "gameRoundName", "roundName"]) ||
          `${gameRoundId} numaralı hafta`,
      };
      const year = readString(row, ["year"]);
      const closeDate = readString(row, [
        "roundCloseDate",
        "closeDate",
        "gameRoundCloseDate",
        "date",
      ]);

      if (year) {
        parsedRound.year = year;
      }

      if (closeDate) {
        parsedRound.closeDate = closeDate;
      }

      return parsedRound;
    })
    .filter((round): round is ParsedOfficialRound => Boolean(round))
    .sort(compareRounds);

  if (rounds.length === 0) {
    return {
      success: false,
      errors: ["Kullanılabilir gameRoundId içeren yayınlanmış hafta bulunamadı."],
    };
  }

  return { success: true, rounds, warnings };
}

function compareRounds(first: ParsedOfficialRound, second: ParsedOfficialRound) {
  const firstTime = first.closeDate ? new Date(first.closeDate).getTime() : Number.NaN;
  const secondTime = second.closeDate ? new Date(second.closeDate).getTime() : Number.NaN;

  if (Number.isFinite(firstTime) && Number.isFinite(secondTime) && firstTime !== secondTime) {
    return secondTime - firstTime;
  }

  if (Number.isFinite(firstTime) && !Number.isFinite(secondTime)) {
    return -1;
  }

  if (!Number.isFinite(firstTime) && Number.isFinite(secondTime)) {
    return 1;
  }

  return second.gameRoundId - first.gameRoundId;
}

function findRows(value: unknown): unknown[] | null {
  if (Array.isArray(value)) {
    return value;
  }

  if (value && typeof value === "object") {
    const objectValue = value as Record<string, unknown>;

    for (const key of ["items", "data", "rounds", "gameRounds", "list"]) {
      if (Array.isArray(objectValue[key])) {
        return objectValue[key];
      }
    }
  }

  return null;
}

function readString(row: unknown, keys: string[]) {
  for (const key of keys) {
    const value = readPath(row, key);

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function readNumber(row: unknown, keys: string[]) {
  for (const key of keys) {
    const value = readPath(row, key);

    if (typeof value === "number" && Number.isInteger(value) && value > 0) {
      return value;
    }

    if (typeof value === "string" && /^[1-9]\d*$/.test(value.trim())) {
      return Number(value);
    }
  }

  return null;
}

function readPath(row: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") {
      return undefined;
    }

    return (current as Record<string, unknown>)[key];
  }, row);
}
