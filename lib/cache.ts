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

const j = (u: string) => fetch(u).then((r) => (r.ok ? r.json() : null));

/** All tab datasets, shaped EXACTLY as each page reads them. */
const WARM_JOBS: WarmEntry[] = [
  { key: "dashboard", get: async () => await j("/api/dashboard") },
  {
    key: "academic",
    get: async () => {
      const [t, s] = await Promise.all([j("/api/tasks"), j("/api/schedule")]);
      return { tasks: t?.tasks ?? [], blocks: s?.blocks ?? [] };
    },
  },
  {
    key: "finance",
    get: async () => {
      const [c, t, g] = await Promise.all([j("/api/categories"), j("/api/transactions"), j("/api/goals")]);
      return { categories: c?.categories ?? [], transactions: t?.transactions ?? [], goals: g?.goals ?? [] };
    },
  },
  {
    key: "health",
    get: async () => {
      const [w, wa, s, h] = await Promise.all([j("/api/workouts?days=35"), j("/api/water?days=7"), j("/api/sleep?days=14"), j("/api/habits")]);
      return { workouts: w?.workouts ?? [], stats: w?.stats, water: wa, sleep: s?.logs ?? [], habits: h };
    },
  },
  {
    key: "profileBundle",
    get: async () => {
      const [m, s, p] = await Promise.all([j("/api/me"), j("/api/settings"), j("/api/push/prefs")]);
      return { me: m, settings: s?.settings, prefs: p?.prefs ?? [] };
    },
  },
  { key: "investProfile", get: async () => (await j("/api/invest"))?.profile ?? null },
  { key: "advisor", get: async () => (await j("/api/advisor"))?.evaluations ?? [] },
];

/** Fetch every tab dataset in parallel and write caches. Resolves even on partial failure. */
export async function warmAll(): Promise<void> {
  await Promise.allSettled(
    WARM_JOBS.map((entry) =>
      entry
        .get()
        .then((data) => {
          if (data !== undefined && data !== null) writeCache(entry.key, data);
        })
        .catch(() => {})
    )
  );
}

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
