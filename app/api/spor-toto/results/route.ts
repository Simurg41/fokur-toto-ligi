import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseOfficialResults } from "@/lib/spor-toto/parse-official-results";

const officialResultsBaseUrl =
  "https://webapi.sportoto.gov.tr/api/GameMatch/GetGameMatches/";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, errors: ["Giriş yapman gerekli."] }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return NextResponse.json(
      { ok: false, errors: ["Bu işlem için admin yetkisi gerekli."] },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(request.url);
  const gameRoundId = searchParams.get("gameRoundId") || "";

  if (!/^[1-9]\d*$/.test(gameRoundId)) {
    return NextResponse.json(
      { ok: false, errors: ["gameRoundId pozitif bir sayı olmalı."] },
      { status: 400 },
    );
  }

  const url = new URL(officialResultsBaseUrl);
  url.searchParams.set("gameRoundId", gameRoundId);

  try {
    // GetGameResultByGameRoundId returns prize/payout data, not 1/X/2 match results.
    // Match results are populated on the official GetGameMatches response after games are played.
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      return NextResponse.json(
        { ok: false, errors: ["Resmî Spor Toto sonuçları alınamadı."] },
        { status: 502 },
      );
    }

    const payload: unknown = await response.json();
    const parsed = parseOfficialResults(payload);

    if (!parsed.success) {
      return NextResponse.json({ ok: false, errors: parsed.errors }, { status: 422 });
    }

    return NextResponse.json({
      ok: true,
      weekNameSuggestion: parsed.weekNameSuggestion,
      results: parsed.results,
      warnings: parsed.warnings,
    });
  } catch {
    return NextResponse.json(
      { ok: false, errors: ["Resmî Spor Toto sonuç API bağlantısı başarısız oldu."] },
      { status: 502 },
    );
  }
}
