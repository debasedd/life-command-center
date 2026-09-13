import Link from "next/link";

export const metadata = { title: "Offline Ready" };

export default function OfflineReadyPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="text-5xl mb-4">✅</div>
      <h1 className="text-xl font-bold mb-2">App siap offline!</h1>
      <p className="text-sm text-zinc-400 mb-6 max-w-xs">
        Service Worker sudah ter-install. Life Command Center bisa dibuka dari Home Screen bahkan tanpa internet.
      </p>
      <Link href="/home" className="bg-indigo-600 rounded-xl px-6 py-3 text-sm font-bold">
        Mulai Pakai →
      </Link>
    </main>
  );
}