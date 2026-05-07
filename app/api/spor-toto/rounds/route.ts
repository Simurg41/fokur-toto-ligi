import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseOfficialRounds } from "@/lib/spor-toto/parse-official-rounds";

const officialRoundsBaseUrl = "https://webapi.sportoto.gov.tr/api/GameRound";

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
  const year = searchParams.get("year") || "2025/2026";
  const isPublished = searchParams.get("isPublished") || "true";

  const url = new URL(officialRoundsBaseUrl);
  url.searchParams.set("year", year);
  url.searchParams.set("isPublished", isPublished);

  try {
    // DevTools showed GameRound?year=2025%2F2026&isPublished=true; official path may change.
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      return NextResponse.json(
        { ok: false, errors: ["Resmî Spor Toto hafta listesi alınamadı."] },
        { status: 502 },
      );
    }

    const payload: unknown = await response.json();
    const parsed = parseOfficialRounds(payload);

    if (!parsed.success) {
      return NextResponse.json({ ok: false, errors: parsed.errors }, { status: 422 });
    }

    return NextResponse.json({
      ok: true,
      rounds: parsed.rounds,
      warnings: parsed.warnings,
    });
  } catch {
    return NextResponse.json(
      { ok: false, errors: ["Resmî Spor Toto hafta API bağlantısı başarısız oldu."] },
      { status: 502 },
    );
  }
}
