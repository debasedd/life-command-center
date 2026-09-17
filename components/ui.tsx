"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/* ============================================================
 * Violet Rail primitives — DesainPakeAI foundation
 * revision sha256-d65642602ee0a179.
 *
 * Order of structure: space first, type second, surfaces last.
 * Cards are the exception, not the layout. One accent ramp,
 * states use positive/warning/danger roles. Motion: transform
 * and opacity only, feedback at 160ms.
 * ============================================================ */

/* ---------- Surfaces ---------- */

export function Card({
  children,
  className = "",
  onClick,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}) {
  return (
    <div
      onClick={onClick}
      style={style}
      className={`rounded-card border border-lineSoft bg-[color:var(--vr-surface-raised)] p-4 ${
        onClick ? "cursor-pointer select-none card-press" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

/* Rail surface: the one hero texture in the system (gradient-rail). */
export function RailCard({
  children,
  className = "",
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-panel border border-lineSoft p-4 ${onClick ? "cursor-pointer select-none card-press" : ""} ${className}`}
      style={{ background: "var(--vr-gradient-rail)" }}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 mt-7 mb-1.5 first:mt-0">
      <h2 className="vr-kicker">{children}</h2>
      {action}
    </div>
  );
}

/* Divider-separated row: grouping by space, separators only where they help. */
export function Row({
  children,
  className = "",
  onClick,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}) {
  return (
    <div
      onClick={onClick}
      style={style}
      className={`flex items-center justify-between gap-3 py-3 border-b border-lineSoft last:border-b-0 ${onClick ? "cursor-pointer select-none card-press" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export function Chip({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "accent" | "positive" | "warning" | "danger" }) {
  const toneClass = {
    neutral: "text-muted border-lineSoft",
    accent: "text-[color:var(--vr-accent)] border-[color:var(--vr-accent)]/30",
    positive: "text-[color:var(--vr-positive)] border-[color:var(--vr-positive)]/30",
    warning: "text-[color:var(--vr-warning)] border-[color:var(--vr-warning)]/30",
    danger: "text-[color:var(--vr-danger)] border-[color:var(--vr-danger)]/30",
  }[tone];
  return (
    <span className={`shrink-0 rounded-control border px-2 py-0.5 text-[11px] font-medium ${toneClass}`}>{children}</span>
  );
}

/* Thin signal bar for progress-like values (water, habits, goals). */
export function SignalBar({ value, color = "var(--vr-accent)", className = "" }: { value: number; color?: string; className?: string }) {
  const pct = Math.max(0, Math.min(100, value * 100));
  return (
    <div className={`h-1 rounded-full bg-white/[0.06] overflow-hidden ${className}`}>
      <div className="h-full rounded-full transition-[width] duration-300 ease-out" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted py-3">{children}</p>;
}

/* ---------- Controls ---------- */

export function Btn({
  children,
  onClick,
  variant = "primary",
  className = "",
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger" | "success";
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const styles = {
    primary:
      "bg-[color:var(--vr-primary)] hover:bg-[color:var(--vr-primary-hover)] text-[color:var(--vr-on-primary)]",
    ghost:
      "bg-transparent border border-lineSoft hover:bg-white/[0.04] active:bg-white/[0.03] text-soft",
    danger: "bg-[color:var(--vr-danger)] hover:brightness-110 text-[color:var(--vr-canvas)]",
    success: "bg-[color:var(--vr-positive)] hover:brightness-110 text-[color:var(--vr-canvas)]",
  }[variant];
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-control px-4 py-2.5 text-sm font-medium transition-[background-color,opacity,transform] duration-[160ms] card-press disabled:opacity-40 disabled:card-press-none ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

const INPUT_CLASS =
  "w-full rounded-control bg-[color:var(--vr-surface)] border border-lineSoft px-3.5 py-2.5 text-base sm:text-sm text-ink placeholder-muted outline-none transition-colors duration-[160ms] focus:border-[color:var(--vr-accent)]";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${INPUT_CLASS} ${props.className || ""}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${INPUT_CLASS} ${props.className || ""}`} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${INPUT_CLASS} ${props.className || ""}`} />;
}

export function ProgressRing({
  value,
  size = 56,
  stroke = 6,
  color = "#531aff",
  children,
}: {
  value: number; // 0..1
  size?: number;
  stroke?: number;
  color?: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--vr-border)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
          style={{ transition: "stroke-dashoffset 0.3s cubic-bezier(0.2, 0, 0, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

/* ---------- Bottom sheet ---------- */

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (!open) return;
    // Failsafe: if entry transition never progresses (frozen clock), force final state.
    const t = setTimeout(() => setSettled(true), 450);
    return () => clearTimeout(t);
  }, [open]);

  if (!open) return null;
  // Portal to body: page roots animate `transform` (animate-rise), which turns
  // position:fixed into absolute vs that ancestor and throws the sheet offscreen.
  const content = (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <div className={`sheet-backdrop ${settled ? "sheet-settled" : ""} absolute inset-0 bg-black/85`} onClick={onClose} />
      <div className={`sheet-panel ${settled ? "sheet-settled" : ""} absolute bottom-0 left-0 right-0 mx-auto max-w-md rounded-t-panel bg-[color:var(--vr-surface-raised)] border-t border-lineSoft max-h-[85vh] overflow-y-auto no-scrollbar`}>
        <div className="sticky top-0 bg-[color:var(--vr-surface-raised)] rounded-t-panel px-4 pt-3 pb-2 flex items-center justify-between border-b border-lineSoft">
          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-white/20" aria-hidden />
          <h3 className="vr-title mt-1">{title}</h3>
          <button onClick={onClose} className="text-muted mt-1 text-xl px-2 hover:text-ink transition-colors duration-[160ms]" aria-label="Tutup">
            ✕
          </button>
        </div>
        <div className="p-4 safe-bottom">{children}</div>
      </div>
    </div>
  );
  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}

/* ---------- Toast ---------- */

let toastFn: ((msg: string, kind?: "ok" | "err") => void) | null = null;
export function toast(msg: string, kind: "ok" | "err" = "ok") {
  toastFn?.(msg, kind);
}

export function ToastHost() {
  const [items, setItems] = useState<{ id: number; msg: string; kind: string }[]>([]);
  const idRef = useRef(0);
  useEffect(() => {
    toastFn = (msg, kind = "ok") => {
      const id = ++idRef.current;
      setItems((prev) => [...items, { id, msg, kind }].slice(-3));
      setTimeout(() => setItems((cur) => cur.filter((t) => t.id !== id)), 2600);
    };
    return () => {
      toastFn = null;
    };
  }, [items]);
  return (
    <div className="fixed top-3 left-0 right-0 z-[100] flex flex-col items-center gap-2 px-4 pointer-events-none">
      {items.map((t) => (
        <div
          key={t.id}
          className="animate-rise flex items-center gap-2 rounded-card px-4 py-2 text-sm font-medium bg-[color:var(--vr-surface-raised)] border border-lineSoft text-ink"
        >
          {/* Non-color cue: glyph carries state, dot is secondary */}
          <span className={`text-xs font-semibold ${t.kind === "ok" ? "text-[color:var(--vr-positive)]" : "text-[color:var(--vr-danger)]"}`}>
            {t.kind === "ok" ? "✓" : "!"}
          </span>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

/* ---------- API helper ---------- */

export async function api<T = unknown>(url: string, options?: RequestInit & { json?: unknown }): Promise<T> {
  const init: RequestInit = { ...options };
  if (options?.json !== undefined) {
    init.method = options.method || "POST";
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(options.json);
  }
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `HTTP ${res.status}`);
  return data as T;
}
