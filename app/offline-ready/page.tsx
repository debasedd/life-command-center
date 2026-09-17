import Link from "next/link";

export const metadata = { title: "Offline Ready" };

export default function OfflineReadyPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="text-5xl mb-4">✅</div>
      <h1 className="text-xl font-bold mb-2">App siap offline!</h1>
      <p className="text-sm text-muted mb-6 max-w-xs">
        Service Worker sudah ter-install. Life Command Center bisa dibuka dari Home Screen bahkan tanpa internet.
      </p>
      <Link href="/home" className="bg-[color:var(--vr-primary)] hover:bg-[color:var(--vr-primary-hover)] rounded-panel px-6 py-3 text-sm font-bold text-[color:var(--vr-on-primary)] transition-colors duration-[160ms]">
        Mulai Pakai →
      </Link>
    </main>
  );
}