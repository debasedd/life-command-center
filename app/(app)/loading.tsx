// Instant skeleton on every route segment navigation (opacity-only breathe — GPU cheap).
export default function Loading() {
  return (
    <div className="space-y-3 pt-1 fade-in" aria-hidden>
      <div className="h-7 w-44 rounded-control bg-black/[0.04] breathe" />
      <div className="h-24 rounded-card bg-black/[0.04] border border-[color:var(--ui-border)] breathe" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-20 rounded-card bg-black/[0.03] border border-[color:var(--ui-border)] breathe" />
        <div className="h-20 rounded-card bg-black/[0.03] border border-[color:var(--ui-border)] breathe" />
      </div>
      <div className="h-36 rounded-card bg-black/[0.03] border border-[color:var(--ui-border)] breathe" />
    </div>
  );
}
