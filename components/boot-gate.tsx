"use client";

import { useEffect, useState } from "react";
import { LayoutGrid } from "lucide-react";
import { warmAll } from "@/lib/cache";

/**
 * Boot gate: on first open of a session, show a splash until ALL tab data
 * is fetched & cached. After that every page paints instantly from warm
 * cache (cache-first + silent revalidate handle the rest).
 * - Failsafe 8s: never trap the user behind the splash.
 * - In-session client navigations keep this component mounted → no re-gate.
 */
export default function BootGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("lcc-booted")) {
      setReady(true);
      return;
    }
    let dead = false;
    const failsafe = setTimeout(() => {
      if (!dead) {
        sessionStorage.setItem("lcc-booted", "1");
        setReady(true);
      }
    }, 8000);

    warmAll().finally(() => {
      if (dead) return;
      clearTimeout(failsafe);
      sessionStorage.setItem("lcc-booted", "1");
      setTimeout(() => !dead && setReady(true), 200);
    });

    return () => {
      dead = true;
      clearTimeout(failsafe);
    };
  }, []);

  if (!ready) {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[color:var(--ui-canvas)] fade-in">
        <div className="w-14 h-14 rounded-[16px] bg-[color:var(--ui-primary)] shadow-[var(--shadow-lift)] flex items-center justify-center text-white fade-rise">
          <LayoutGrid size={26} strokeWidth={1.75} aria-hidden />
        </div>
        <div className="title-lg mt-4 fade-rise" style={{ animationDelay: "60ms" }}>
          Life Command Center
        </div>
        <div className="mt-6 w-32 h-[3px] rounded-full bg-[color:var(--ui-border)] overflow-hidden">
          <div className="h-full w-1/2 rounded-full bg-[color:var(--ui-text)] sweep" />
        </div>
        <p className="mt-3 text-[11px] text-[color:var(--ui-text-muted)] fade-in" style={{ animationDelay: "180ms" }}>
          Menyiapkan data…
        </p>
      </div>
    );
  }

  return <>{children}</>;
}