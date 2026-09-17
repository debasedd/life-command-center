"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, BookOpen, Wallet, HeartPulse, User } from "lucide-react";

const TABS = [
  { href: "/home", label: "Beranda", Icon: House },
  { href: "/tasks", label: "Akademik", Icon: BookOpen },
  { href: "/finance", label: "Keuangan", Icon: Wallet },
  { href: "/health", label: "Kesehatan", Icon: HeartPulse },
  { href: "/profile", label: "Profil", Icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 mx-auto max-w-md bg-[color:var(--ui-surface)]/[0.96] backdrop-blur-md border-t border-[color:var(--ui-border)] safe-bottom"
      aria-label="Navigasi utama"
    >
      <div className="flex">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className="relative flex-1 flex flex-col items-center gap-1 py-2.5 press"
            >
              <span
                className={`transition-[color,transform] duration-[220ms] ease-out ${
                  active ? "text-[color:var(--ui-text)] -translate-y-[1px]" : "text-[color:var(--ui-text-muted)]"
                }`}
              >
                <Icon size={21} strokeWidth={active ? 2 : 1.75} aria-hidden />
              </span>
              <span
                className={`text-[10px] font-semibold transition-colors duration-[220ms] ${
                  active ? "text-[color:var(--ui-text)]" : "text-[color:var(--ui-text-muted)]"
                }`}
              >
                {label}
              </span>
              <span
                className={`absolute top-0 left-1/2 -translate-x-1/2 h-[2.5px] rounded-full bg-[color:var(--ui-text)] transition-all duration-[320ms] ease-out ${
                  active ? "w-7 opacity-100" : "w-0 opacity-0"
                }`}
                aria-hidden
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
