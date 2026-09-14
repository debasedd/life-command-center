"use client";

import { useEffect } from "react";

/**
 * Registers the service worker and keeps clients on fresh bundles:
 * - Detects chunk-load crashes (stale HTML + new deploy) → one-time reload.
 * - Detects a waiting new SW → activates it → reloads once.
 * Both guards use sessionStorage flags to prevent reload loops.
 */
export default function SWRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const onChunkError = (e: ErrorEvent) => {
      const msg = e.message || "";
      if (/Loading chunk|ChunkLoadError|dynamically imported module|error loading dynamically/i.test(msg)) {
        if (!sessionStorage.getItem("lcc-chunk-reload")) {
          sessionStorage.setItem("lcc-chunk-reload", "1");
          location.reload();
        }
      }
    };
    window.addEventListener("error", onChunkError);

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        // Check for a new SW every minute (deploy marker: sw.js bytes change).
        setInterval(() => reg.update().catch(() => {}), 60_000);

        reg.addEventListener("updatefound", () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener("statechange", () => {
            // Awaiting worker + page already controlled by an old SW = new deploy.
            if (nw.state === "installed" && navigator.serviceWorker.controller) {
              if (!sessionStorage.getItem("lcc-sw-reload")) {
                sessionStorage.setItem("lcc-sw-reload", "1");
                nw.postMessage({ type: "SKIP_WAITING" });
              }
            }
          });
        });
      })
      .catch(() => {});

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      if (sessionStorage.getItem("lcc-sw-reload")) location.reload();
    });

    return () => window.removeEventListener("error", onChunkError);
  }, []);
  return null;
}
