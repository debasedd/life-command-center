import Link from "next/link";
import { CircleCheck, ArrowRight } from "lucide-react";

export const metadata = { title: "Offline Ready" };

export default function OfflineReadyPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center fade-rise">
      <div className="w-14 h-14 rounded-[16px] bg-[color:var(--ui-surface)] border border-[color:var(--ui-border)] shadow-[var(--shadow-card)] flex items-center justify-center text-[color:var(--ui-positive)] mb-4">
        <CircleCheck size={26} strokeWidth={1.75} aria-hidden />
      </div>
      <h1 className="display mb-2">App siap offline</h1>
      <p className="text-sm text-muted mb-6 max-w-xs">
        Service Worker sudah ter-install. Life Command Center bisa dibuka dari Home Screen bahkan tanpa internet.
      </p>
      <Link
        href="/home"
        className="inline-flex items-center gap-2 bg-[color:var(--ui-primary)] hover:bg-[color:var(--ui-primary-hover)] rounded-control px-6 py-3 text-sm font-semibold text-[color:var(--ui-on-primary)] press transition-[background-color,box-shadow] duration-[180ms] shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-card)]"
      >
        Mulai Pakai <ArrowRight size={16} strokeWidth={2} aria-hidden />
      </Link>
    </main>
  );
}
