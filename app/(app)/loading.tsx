// Instant skeleton on every route segment navigation (opacity-only pulse — GPU cheap).
export default function Loading() {
  return (
    <div className="space-y-3 pt-1 animate-rise" aria-hidden>
      <div className="h-7 w-44 rounded-md bg-white/[0.04] pulse" />
      <div className="h-24 rounded-lg bg-white/[0.03] border border-white/[0.06] pulse" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-20 rounded-lg bg-white/[0.03] border border-white/[0.06] pulse" />
        <div className="h-20 rounded-lg bg-white/[0.03] border border-white/[0.06] pulse" />
      </div>
      <div className="h-36 rounded-lg bg-white/[0.03] border border-white/[0.06] pulse" />
    </div>
  );
}
