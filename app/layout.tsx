import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { BottomNavigation } from "@/components/bottom-navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: {
    default: "Fokur Toto Ligi",
    template: "%s | Fokur Toto Ligi",
  },
  description: "Fokur Toto Ligi kupon tahminlerini mobil odaklı takip et.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Fokur Toto Ligi",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f766e",
  width: "device-width",
  initialScale: 1,
};

const desktopLinks = [
  { href: "/tahminler", label: "Tahminler" },
  { href: "/sonuclar", label: "Sonuçlar" },
  { href: "/puan-tablosu", label: "Puan" },
  { href: "/haftalar", label: "Haftalar" },
  { href: "/sezon", label: "Sezon" },
  { href: "/profil", label: "Profil" },
];

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, isAdmin } = await loadShellUser();

  return (
    <html lang="tr">
      <body>
        <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-3 sm:px-5 lg:px-8">
          <header className="sticky top-0 z-30 hidden py-4 md:block">
            <div className="flex items-center justify-between rounded-2xl border border-white/70 bg-white/85 px-4 py-3 shadow-sm backdrop-blur">
              <Link href="/" className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-700 text-sm font-black text-white">
                  FT
                </span>
                <span>
                  <span className="block text-sm font-black text-slate-950">Fokur Toto Ligi</span>
                  <span className="block text-xs font-semibold text-slate-500">1/X/2 tahmin ligi</span>
                </span>
              </Link>
              <nav className="flex items-center gap-1">
                {(user ? desktopLinks : [{ href: "/giris", label: "Giriş" }]).map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-xl px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-teal-50 hover:text-teal-800"
                  >
                    {item.label}
                  </Link>
                ))}
                {isAdmin ? (
                  <Link
                    href="/admin"
                    className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-black text-teal-800 shadow-sm transition hover:border-teal-300 hover:bg-teal-100"
                  >
                    Admin
                  </Link>
                ) : null}
              </nav>
            </div>
          </header>
          <main className="flex-1 pb-28 pt-4 md:pb-10 md:pt-2">{children}</main>
          <BottomNavigation />
        </div>
      </body>
    </html>
  );
}

async function loadShellUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, isAdmin: false };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return { user, isAdmin: profile?.role === "admin" };
}
