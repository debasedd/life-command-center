"use client";

import { useEffect, useState } from "react";
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
      // Small beat so the splash fade-out reads smoothly instead of flashing.
      setTimeout(() => !dead && setReady(true), 200);
    });

    return () => {
      dead = true;
      clearTimeout(failsafe);
    };
  }, []);

  if (!ready) {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#13111c]">
        <div className="text-[15px] font-semibold tracking-[-0.02em] text-[#ffffff]">Life Command Center</div>
        <div className="mt-5 w-32 h-[3px] rounded-full bg-white/[0.06] overflow-hidden">
          <div className="h-full w-1/2 rounded-full bg-[#553f83] splash-bar" />
        </div>
        <p className="mt-3 text-[11px] text-[#868593]">Menyiapkan data…</p>
      </div>
    );
  }

  return <>{children}</>;
}
