"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/home", icon: "🏠", label: "Beranda" },
  { href: "/tasks", icon: "📚", label: "Akademik" },
  { href: "/finance", icon: "💰", label: "Keuangan" },
  { href: "/health", icon: "💪", label: "Kesehatan" },
  { href: "/profile", icon: "⚙️", label: "Profil" },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 mx-auto max-w-md bg-zinc-950/95 backdrop-blur border-t border-zinc-800 safe-bottom">
      <div className="flex">
        {TABS.map((t) => {
          const active = pathname === t.href || pathname.startsWith(t.href + "/");
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 ${active ? "text-indigo-400" : "text-zinc-500"}`}
            >
              <span className="text-xl leading-none">{t.icon}</span>
              <span className="text-[10px] font-medium">{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}