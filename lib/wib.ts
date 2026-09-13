/** Helpers for WIB (Asia/Jakarta, UTC+7) day handling. */

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Current date string in WIB: yyyy-mm-dd */
export function wibToday(now: Date = new Date()): string {
  return new Date(now.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10);
}

/** Current minute-of-day in WIB (0-1439). */
export function wibMinuteOfDay(now: Date = new Date()): number {
  const d = new Date(now.getTime() + WIB_OFFSET_MS);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

/** Current weekday in WIB: 0=Sun..6=Sat */
export function wibWeekday(now: Date = new Date()): number {
  return new Date(now.getTime() + WIB_OFFSET_MS).getUTCDay();
}

/** Current minute-of-week in WIB (minutes since Sunday 00:00). */
export function wibMinuteOfWeek(now: Date = new Date()): number {
  return wibWeekday(now) * 1440 + wibMinuteOfDay(now);
}

/** yyyy-mm-dd for N days ago/before, in WIB. */
export function dayOffset(base: string, days: number): string {
  const d = new Date(base + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Last N days inclusive, oldest first: ["2026-09-07", ...] */
export function lastNDays(n: number, end: string = wibToday()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(dayOffset(end, -i));
  return out;
}

export function formatIDR(amount: number): string {
  return "Rp" + amount.toLocaleString("id-ID");
}

export function minutesToHHMM(m: number): string {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}