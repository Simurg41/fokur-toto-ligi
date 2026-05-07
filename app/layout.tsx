import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNavigation } from "@/components/bottom-navigation";

export const metadata: Metadata = {
  title: {
    default: "Spor Toto Tahmin",
    template: "%s | Spor Toto Tahmin",
  },
  description: "Spor Toto kupon tahminlerini mobil odaklı takip et.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Spor Toto Tahmin",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f766e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body>
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col">
          <main className="flex-1 px-4 pb-28 pt-4 sm:px-6">{children}</main>
          <BottomNavigation />
        </div>
      </body>
    </html>
  );
}
