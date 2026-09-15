"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/* ---------- Shared primitives (Linear-inspired) ----------
 * Surfaces: white @ 2-5% opacity over #08090a. Borders: white @ 5-8%.
 * Accent #5e6ad2 / #7170ff reserved for interactive elements only.
 * Motion: transform/opacity only → GPU composited, holds 120Hz.
 */

export function Card({
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
      className={`rounded-lg bg-white/[0.02] border border-white/[0.08] p-4 ${
        onClick ? "cursor-pointer select-none card-press" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-2 mt-6 first:mt-0">
      <h2 className="text-[13px] font-medium text-[#8a8f98] tracking-[-0.01em]">{children}</h2>
      {action}
    </div>
  );
}

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
    primary: "bg-[#5e6ad2] hover:bg-[#6975e0] active:bg-[#5561c8] text-white",
    ghost: "bg-white/[0.02] border border-white/[0.08] hover:bg-white/[0.04] active:bg-white/[0.03] text-[#d0d6e0]",
    danger: "bg-[#eb5757]/90 hover:bg-[#eb5757] text-white",
    success: "bg-[#27a644] hover:bg-[#2fbd50] text-white",
  }[variant];
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-md px-4 py-2.5 text-sm font-medium transition-colors duration-150 card-press disabled:opacity-40 disabled:card-press-none ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-md bg-white/[0.02] border border-white/[0.08] px-3.5 py-2.5 text-sm text-[#f7f8f8] placeholder-[#62666d] outline-none transition-colors duration-150 focus:border-[#7170ff] ${props.className || ""}`}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-md bg-white/[0.02] border border-white/[0.08] px-3 py-2.5 text-sm text-[#f7f8f8] outline-none transition-colors duration-150 focus:border-[#7170ff] ${props.className || ""}`}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-md bg-white/[0.02] border border-white/[0.08] px-3.5 py-2.5 text-sm text-[#f7f8f8] placeholder-[#62666d] outline-none transition-colors duration-150 focus:border-[#7170ff] ${props.className || ""}`}
    />
  );
}

export function ProgressRing({
  value,
  size = 56,
  stroke = 6,
  color = "#7170ff",
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
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#23252a" strokeWidth={stroke} />
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
  if (!open) return null;
  // Portal to body: page roots animate `transform` (animate-rise), which turns
  // position:fixed into absolute vs that ancestor and throws the sheet offscreen.
  const content = (
    <div className="fixed inset-0 z-50">
      <div className="sheet-backdrop absolute inset-0 bg-black/85" onClick={onClose} />
      <div className="sheet-panel absolute bottom-0 left-0 right-0 mx-auto max-w-md rounded-t-xl bg-[#191a1b] border-t border-white/[0.08] max-h-[85vh] overflow-y-auto no-scrollbar">
        <div className="sticky top-0 bg-[#191a1b] rounded-t-xl px-4 pt-3 pb-2 flex items-center justify-between border-b border-white/[0.06]">
          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-white/20" />
          <h3 className="text-base font-semibold mt-1 text-[#f7f8f8]">{title}</h3>
          <button onClick={onClose} className="text-[#8a8f98] mt-1 text-xl px-2 hover:text-[#f7f8f8] transition-colors duration-150">
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
          className="animate-rise flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium bg-[#191a1b] border border-white/[0.08] text-[#f7f8f8]"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${t.kind === "ok" ? "bg-[#27a644]" : "bg-[#eb5757]"}`} />
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
