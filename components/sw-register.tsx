"use client";

import { useEffect } from "react";

/** Registers the service worker app-wide (client component in app shell). */
export default function SWRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}