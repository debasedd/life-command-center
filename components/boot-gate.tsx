"use client";

import { useEffect, useState } from "react";
import { warmAll } from "@/lib/cache";

/**
 * Boot gate: white splash until every tab's data is cached.
 * Center stage: the word "connecting" assembles itself from scrambled
 * glyphs (one letter locks every ~165ms), then the gate fades out.
 * - Failsafe 8s: never trap the user behind the splash.
 * - In-session client navigations keep this mounted → no re-gate.
 */

const TARGET = "connecting";
const GLYPHS = "abcdefghijklmnopqrstuvwxyz";
const TICK_MS = 55;
const LOCK_EVERY_TICKS = 3; // ≈165ms per letter → ~1,7s full resolve

export default function BootGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState<"boot" | "fading" | "done">("boot");
  const [word, setWord] = useState(TARGET);

  // Already booted this session → skip the gate (post-hydration check avoids SSR mismatch).
  useEffect(() => {
    if (sessionStorage.getItem("lcc-booted")) {
      setReady(true);
      setPhase("done");
    }
  }, []);

  // Scramble clock — fresh random glyphs every tick, letters lock left→right.
  useEffect(() => {
    if (phase !== "boot") return;
    let frame = 0;
    const iv = setInterval(() => {
      frame += 1;
      const locked = Math.min(TARGET.length, Math.floor(frame / LOCK_EVERY_TICKS));
      setWord(
        TARGET.split("")
          .map((ch, i) => (i < locked ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]))
          .join("")
      );
    }, TICK_MS);
    return () => clearInterval(iv);
  }, [phase]);

  useEffect(() => {
    if (sessionStorage.getItem("lcc-booted")) return;
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
      setReady(true);
    });

    return () => {
      dead = true;
      clearTimeout(failsafe);
    };
  }, []);

  // Data ready + word fully assembled → hold one beat → fade out → unmount.
  const resolved = word === TARGET;
  useEffect(() => {
    if (phase !== "boot" || !ready || !resolved) return;
    const hold = setTimeout(() => setPhase("fading"), 420);
    return () => clearTimeout(hold);
  }, [phase, ready, resolved]);
  useEffect(() => {
    if (phase !== "fading") return;
    const t = setTimeout(() => setPhase("done"), 340);
    return () => clearTimeout(t);
  }, [phase]);

  if (phase === "done") return <>{children}</>;

  return (
    <>
      {children}
      <div
        className={`fixed inset-0 z-[200] flex flex-col items-center justify-center bg-white transition-opacity duration-300 ${
          phase === "fading" ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        {/* Mark — same geometry as the app icon */}
        <svg width="44" height="44" viewBox="0 0 512 512" aria-hidden className="fade-in">
          <rect width="512" height="512" rx="112" fill="#111113" />
          <rect x="96" y="160" width="320" height="46" rx="23" fill="#ffffff" />
          <rect x="96" y="233" width="230" height="46" rx="23" fill="#ffffff" opacity="0.78" />
          <rect x="96" y="306" width="150" height="46" rx="23" fill="#ffffff" opacity="0.55" />
        </svg>

        <p
          className="mt-6 select-none"
          style={{
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
            fontSize: 15,
            letterSpacing: "0.42em",
            textTransform: "lowercase",
            color: "#111113",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {word}
          <span className="breathe" style={{ opacity: 0.35 }}>
            _
          </span>
        </p>
      </div>
    </>
  );
}
