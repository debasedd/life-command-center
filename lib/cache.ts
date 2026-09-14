/**
 * Cache-first data layer: instant paint from localStorage, silent revalidate.
 * Pages read cache in useLayoutEffect (before first paint — no skeleton flash),
 * write cache after every successful fetch, and prewarm other tabs' data in idle time.
 *
 * PREFIX v2: invalidates every entry written before shapes were aligned
 * (poisoned entries from mismatched prewarm keys can never crash pages again).
 */
const PREFIX = "lcc2:";

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

export type WarmEntry = { key: string; get: () => Promise<unknown> };

/** Fire-and-forget composite fetches that write EXACTLY the shapes pages read, in idle time. */
export function prewarm(entries: WarmEntry[]) {
  if (typeof window === "undefined") return;
  const run = () => {
    for (const entry of entries) {
      entry
        .get()
        .then((data) => data !== undefined && data !== null && writeCache(entry.key, data))
        .catch(() => {});
    }
  };
  if ("requestIdleCallback" in window) {
    (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void }).requestIdleCallback(run, { timeout: 3000 });
  } else {
    setTimeout(run, 1200);
  }
}
