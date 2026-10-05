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

/**
 * Midnight WIB of the day containing `d`, as an absolute Date.
 * Serverless runs in UTC, so `new Date(y, m, d)` would resolve to UTC midnight
 * and every "+7h" shift afterwards would be off by the WIB offset.
 */
export function wibStartOfDay(d: Date): Date {
  const shifted = new Date(d.getTime() + WIB_OFFSET_MS);
  return new Date(
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) - WIB_OFFSET_MS
  );
}

/** Absolute instant of `minuteOfDay` (0-1439) on the WIB day containing `d`. */
export function wibMinuteInstant(d: Date, minuteOfDay: number): Date {
  return new Date(wibStartOfDay(d).getTime() + minuteOfDay * 60 * 1000);
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

/**
 * Format a yyyy-mm-dd day string for display.
 * `new Date("2026-01-15T00:00:00")` parses as LOCAL midnight, so a device west
 * of WIB would render the previous day. Pinning the offset keeps the label
 * equal to the stored day string.
 */
export function formatDayLabel(
  day: string,
  opts: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" }
): string {
  return new Date(`${day}T00:00:00+07:00`).toLocaleDateString("id-ID", { ...opts, timeZone: "Asia/Jakarta" });
}