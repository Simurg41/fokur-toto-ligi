import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseOfficialMatches } from "@/lib/spor-toto/parse-official-matches";

const officialMatchesBaseUrl =
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

  const url = new URL(officialMatchesBaseUrl);
  url.searchParams.set("gameRoundId", gameRoundId);

  try {
    // The official endpoint may change; keep this route intentionally small and easy to replace.
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      return NextResponse.json(
        { ok: false, errors: ["Resmî Spor Toto listesi alınamadı."] },
        { status: 502 },
      );
    }

    const payload: unknown = await response.json();
    const parsed = parseOfficialMatches(payload);

    if (!parsed.success) {
      return NextResponse.json({ ok: false, errors: parsed.errors }, { status: 422 });
    }

    return NextResponse.json({
      ok: true,
      weekNameSuggestion: parsed.weekNameSuggestion,
      matches: parsed.matches,
    });
  } catch {
    return NextResponse.json(
      { ok: false, errors: ["Resmî Spor Toto API bağlantısı başarısız oldu."] },
      { status: 502 },
    );
  }
}
