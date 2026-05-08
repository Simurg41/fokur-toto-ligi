export type ParsedSporTotoMatch = {
  position: number;
  home_team: string;
  away_team: string;
  starts_at: string | null;
  home_external_team_id?: number | null;
  away_external_team_id?: number | null;
};

type ParseSuccess = {
  success: true;
  matches: ParsedSporTotoMatch[];
};

type ParseFailure = {
  success: false;
  errors: string[];
};

export type ParsePastedListResult = ParseSuccess | ParseFailure;

export function parsePastedSporTotoList(input: string): ParsePastedListResult {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const errors: string[] = [];

  if (lines.length !== 15) {
    errors.push("Liste tam olarak 15 dolu satır içermeli.");
  }

  const matches = lines.map((line, index) => {
    const lineNumber = index + 1;
    const [positionValue, homeTeam, awayTeam, startsAt, ...extraFields] = line
      .split(";")
      .map((field) => field.trim());
    const position = Number(positionValue);

    if (extraFields.length > 0) {
      errors.push(`${lineNumber}. satırda fazla alan var.`);
    }

    if (!Number.isInteger(position) || position < 1 || position > 15) {
      errors.push(`${lineNumber}. satırda maç numarası 1 ile 15 arasında olmalı.`);
    }

    if (!homeTeam) {
      errors.push(`${lineNumber}. satırda ev sahibi takım gerekli.`);
    }

    if (!awayTeam) {
      errors.push(`${lineNumber}. satırda deplasman takımı gerekli.`);
    }

    if (startsAt && Number.isNaN(new Date(startsAt).getTime())) {
      errors.push(`${lineNumber}. satırda maç zamanı geçerli bir tarih olmalı.`);
    }

    return {
      position,
      home_team: homeTeam || "",
      away_team: awayTeam || "",
      starts_at: startsAt || null,
      home_external_team_id: null,
      away_external_team_id: null,
    };
  });

  const positions = new Set(matches.map((match) => match.position));

  if (positions.size !== matches.length) {
    errors.push("Maç numaraları tekrar etmemeli.");
  }

  for (let position = 1; position <= 15; position += 1) {
    if (!positions.has(position)) {
      errors.push(`${position}. maç listede bulunmalı.`);
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    matches: matches.sort((first, second) => first.position - second.position),
  };
}
