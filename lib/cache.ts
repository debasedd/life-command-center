/**
 * Cache-first data layer: instant paint from localStorage, silent revalidate.
 * Pages read cache in useLayoutEffect (before first paint — no skeleton flash),
 * write cache after every successful fetch, and prewarm other tabs' data in idle time.
 */
const PREFIX = "lcc:";

export function readCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeCache(key: string, data: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(data));
  } catch {
    // quota exceeded — drop silently, cache is best-effort
  }
}

type WarmEntry = [key: string, url: string];

/** Fire-and-forget fetch + cache write for other tabs' data, in idle time. */
export function prewarm(entries: WarmEntry[]) {
  if (typeof window === "undefined") return;
  const run = () => {
    for (const [key, url] of entries) {
      fetch(url)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && writeCache(key, d))
        .catch(() => {});
    }
  };
  if ("requestIdleCallback" in window) {
    (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void }).requestIdleCallback(run, { timeout: 3000 });
  } else {
    setTimeout(run, 1200);
  }
}
