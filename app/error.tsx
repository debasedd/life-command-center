"use client";

import { useEffect } from "react";
import { TriangleAlert, RotateCcw } from "lucide-react";

/**
 * Route-level error boundary. Without this, any render error leaves a blank
 * page with no recovery path on a phone.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[app-error]", error);
  }, [error]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center fade-rise">
      <div className="w-14 h-14 rounded-[16px] bg-[color:var(--ui-danger-soft)] border border-[color:var(--ui-danger)]/25 flex items-center justify-center text-[color:var(--ui-danger)] mb-4">
        <TriangleAlert size={26} strokeWidth={1.75} aria-hidden />
      </div>
      <h1 className="display mb-2">Ada yang error</h1>
      <p className="text-sm text-muted mb-6 max-w-xs">
        Halaman ini gagal dimuat. Coba lagi — data kamu tetap aman.
      </p>
      {error.digest && (
        <p className="text-[10px] text-[color:var(--ui-text-muted)] mb-4 num">ref: {error.digest}</p>
      )}
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 bg-[color:var(--ui-primary)] hover:bg-[color:var(--ui-primary-hover)] rounded-control px-6 py-3 text-sm font-semibold text-[color:var(--ui-on-primary)] press transition-[background-color,box-shadow] duration-[180ms] shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-card)]"
      >
        <RotateCcw size={16} strokeWidth={2} aria-hidden />
        Coba Lagi
      </button>
    </main>
  );
}