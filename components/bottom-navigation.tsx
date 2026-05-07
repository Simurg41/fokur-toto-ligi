"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

const navItems = [
  { href: "/", label: "Ana Sayfa", icon: "A" },
  { href: "/tahminler", label: "Tahminler", icon: "1X2" },
  { href: "/sonuclar", label: "Sonuçlar", icon: "S" },
  { href: "/puan-tablosu", label: "Puan", icon: "#" },
  { href: "/profil", label: "Profil", icon: "P" },
  { href: "/giris", label: "Giriş", icon: "G" },
];

export function BottomNavigation() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const visibleNavItems = useMemo(
    () => (isAdmin ? [...navItems, { href: "/admin", label: "Admin", icon: "Y" }] : navItems),
    [isAdmin],
  );

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();

    async function loadRoleForUser(userId: string | undefined) {
      if (!userId) {
        if (isMounted) {
          setIsAdmin(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      if (isMounted) {
        setIsAdmin(!error && data?.role === "admin");
      }
    }

    async function loadCurrentRole() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      await loadRoleForUser(session?.user.id);
    }

    loadCurrentRole();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void Promise.resolve().then(() => loadRoleForUser(session?.user.id));
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [pathname]);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-2 py-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur">
      <div
        className="mx-auto grid max-w-md gap-1"
        style={{ gridTemplateColumns: `repeat(${visibleNavItems.length}, minmax(0, 1fr))` }}
      >
        {visibleNavItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-md px-1 text-xs font-semibold transition ${
                isActive ? "bg-teal-700 text-white" : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              <span className="text-sm font-bold leading-none">{item.icon}</span>
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
