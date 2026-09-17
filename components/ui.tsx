"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Package, Utensils, Bus, BookOpen, Gamepad2, Pill, Landmark, Shirt, Music, CircleDot,
  Target, Bike, Smartphone, Laptop, Shield, Plane, GraduationCap, House, Check, Footprints,
  Ban, Guitar, Brush, PersonStanding, HeartHandshake, CircleCheck, Dumbbell, Droplets, Moon,
  Wallet, PiggyBank, ShoppingCart, Coffee, Heart, Star, Zap, Palette, Sparkles, Circle,
  TrendingUp, TrendingDown, Scale, Bell, Camera, FileText, Clock, CalendarDays, MapPin,
  TriangleAlert, X, type LucideIcon,
} from "lucide-react";

/* ============================================================
 * White minimal primitives.
 * Surfaces: white + hairline border + layered soft shadow.
 * One near-black primary. Motion: 140–320ms, transform/opacity
 * only, interruptible. Icons are Lucide vectors — never emoji.
 * ============================================================ */

/* ---------- Icons ---------- */

const EMOJI_MAP: Record<string, LucideIcon> = {
  "📦": Package, "🍜": Utensils, "🚌": Bus, "📚": BookOpen, "🎮": Gamepad2, "💊": Pill,
  "🏦": Landmark, "👕": Shirt, "🎵": Music, "⚽": CircleDot, "🎯": Target, "🚲": Bike,
  "📱": Smartphone, "💻": Laptop, "🛡️": Shield, "✈️": Plane, "🎓": GraduationCap, "🏠": House,
  "✅": CircleCheck, "📖": BookOpen, "🧘": PersonStanding, "🦷": Sparkles, "🙏": HeartHandshake,
  "🚭": Ban, "🎸": Guitar, "🧹": Brush, "💰": Wallet, "🐷": PiggyBank, "🛒": ShoppingCart,
  "☕": Coffee, "❤️": Heart, "⭐": Star, "⚡": Zap, "🎨": Palette, "💧": Droplets,
};

const NAME_MAP: Record<string, LucideIcon> = {
  package: Package, utensils: Utensils, bus: Bus, "book-open": BookOpen, book: BookOpen,
  gamepad: Gamepad2, pill: Pill, landmark: Landmark, shirt: Shirt, music: Music,
  target: Target, bike: Bike, smartphone: Smartphone, laptop: Laptop, shield: Shield,
  plane: Plane, "graduation-cap": GraduationCap, home: House, house: House, check: Check,
  footprints: Footprints, ban: Ban, guitar: Guitar, brush: Brush, "person-standing": PersonStanding,
  "heart-handshake": HeartHandshake, dumbbell: Dumbbell, droplets: Droplets, moon: Moon,
  wallet: Wallet, "piggy-bank": PiggyBank, "shopping-cart": ShoppingCart, coffee: Coffee,
  heart: Heart, star: Star, zap: Zap, palette: Palette, sparkles: Sparkles,
  "trending-up": TrendingUp, "trending-down": TrendingDown, scale: Scale, bell: Bell,
  camera: Camera, "file-text": FileText, clock: Clock, calendar: CalendarDays, "map-pin": MapPin,
};

/** Emoji legacy value, kebab name, or anything else → real vector icon. */
export function resolveIcon(value: string | null | undefined): LucideIcon {
  if (!value) return Circle;
  return EMOJI_MAP[value] ?? NAME_MAP[value.trim().toLowerCase()] ?? Circle;
}

export function Icon({
  name,
  size = 18,
  className = "",
  strokeWidth = 1.75,
}: {
  name: string | null | undefined;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  const C = resolveIcon(name);
  return <C size={size} strokeWidth={strokeWidth} className={className} aria-hidden />;
}

/** Curated picker set — kebab names stored in DB. */
export const ICON_CHOICES: string[] = [
  "package", "utensils", "bus", "book-open", "gamepad", "pill", "landmark", "shirt",
  "music", "coffee", "shopping-cart", "wallet", "piggy-bank", "target", "bike", "smartphone",
  "laptop", "shield", "plane", "graduation-cap", "home", "dumbbell", "droplets", "moon",
  "heart", "star", "zap", "palette", "camera", "file-text",
];

/* ---------- Surfaces ---------- */

export function Card({
  children,
  className = "",
  onClick,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={style}
      className={`surface p-4 ${onClick ? "cursor-pointer select-none press" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 mt-7 mb-1.5 first:mt-0">
      <h2 className="kicker">{children}</h2>
      {action}
    </div>
  );
}

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
      className={`flex items-center justify-between gap-3 py-3 border-b border-[color:var(--ui-border)] last:border-b-0 ${
        onClick ? "cursor-pointer select-none press" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function Chip({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "accent" | "positive" | "warning" | "danger" }) {
  const toneClass = {
    neutral: "text-[color:var(--ui-text-soft)] border-[color:var(--ui-border-strong)] bg-[color:var(--ui-surface-muted)]",
    accent: "text-[color:var(--ui-text)] border-[color:var(--ui-border-strong)] bg-[color:var(--ui-surface-muted)]",
    positive: "text-[color:var(--ui-positive)] border-transparent bg-[color:var(--ui-positive-soft)]",
    warning: "text-[color:var(--ui-warning)] border-transparent bg-[color:var(--ui-warning-soft)]",
    danger: "text-[color:var(--ui-danger)] border-transparent bg-[color:var(--ui-danger-soft)]",
  }[tone];
  return (
    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold tracking-wide ${toneClass}`}>{children}</span>
  );
}

export function SignalBar({ value, color = "var(--ui-primary)", className = "" }: { value: number; color?: string; className?: string }) {
  const pct = Math.max(0, Math.min(100, value * 100));
  return (
    <div className={`h-[5px] rounded-full bg-[color:var(--ui-border)] overflow-hidden ${className}`}>
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-out"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-[color:var(--ui-text-muted)] py-3">{children}</p>;
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
      "bg-[color:var(--ui-primary)] text-[color:var(--ui-on-primary)] hover:bg-[color:var(--ui-primary-hover)] shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-card)]",
    ghost:
      "bg-[color:var(--ui-surface)] border border-[color:var(--ui-border)] text-[color:var(--ui-text-soft)] hover:bg-[color:var(--ui-surface-muted)] hover:text-[color:var(--ui-text)] shadow-[var(--shadow-xs)]",
    danger: "bg-[color:var(--ui-danger)] text-white hover:brightness-110 shadow-[var(--shadow-xs)]",
    success: "bg-[color:var(--ui-positive)] text-white hover:brightness-110 shadow-[var(--shadow-xs)]",
  }[variant];
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-control px-4 py-2.5 text-sm font-semibold press transition-[background-color,box-shadow,opacity,transform] duration-[180ms] disabled:opacity-40 disabled:shadow-none ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

const INPUT_CLASS =
  "w-full rounded-control bg-[color:var(--ui-surface)] border border-[color:var(--ui-border)] px-3.5 py-2.5 text-base sm:text-sm text-[color:var(--ui-text)] placeholder-[color:var(--ui-text-muted)] outline-none transition-[border-color,box-shadow] duration-[180ms] focus:border-[color:var(--ui-focus-ring)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.12)]";

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
  color = "var(--ui-primary)",
  children,
}: {
  value: number;
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
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ui-border)" strokeWidth={stroke} />
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
          style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.22, 1, 0.36, 1)" }}
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
    const t = setTimeout(() => setSettled(true), 450);
    return () => clearTimeout(t);
  }, [open]);

  if (!open) return null;
  const content = (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <div className={`sheet-backdrop ${settled ? "sheet-settled" : ""} absolute inset-0 bg-black/40`} onClick={onClose} />
      <div
        className={`sheet-panel ${settled ? "sheet-settled" : ""} absolute bottom-0 left-0 right-0 mx-auto max-w-md rounded-t-[20px] bg-[color:var(--ui-surface)] border-t border-[color:var(--ui-border)] max-h-[85vh] overflow-y-auto no-scrollbar`}
        style={{ boxShadow: "var(--shadow-sheet)" }}
      >
        <div className="sticky top-0 bg-[color:var(--ui-surface)] rounded-t-[20px] px-4 pt-3 pb-2 flex items-center justify-between border-b border-[color:var(--ui-border)] z-10">
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-9 h-1 rounded-full bg-[color:var(--ui-border-strong)]" aria-hidden />
          <h3 className="title-lg mt-1.5">{title}</h3>
          <button onClick={onClose} className="text-[color:var(--ui-text-muted)] mt-1 p-2 -mr-2 hover:text-[color:var(--ui-text)] transition-colors duration-[180ms]" aria-label="Tutup">
            <X size={18} strokeWidth={1.75} />
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
          className="fade-rise flex items-center gap-2 rounded-panel px-4 py-2.5 text-sm font-medium bg-[color:var(--ui-surface)] border border-[color:var(--ui-border)] text-[color:var(--ui-text)]"
          style={{ boxShadow: "var(--shadow-lift)" }}
        >
          {t.kind === "ok" ? (
            <CircleCheck size={16} strokeWidth={2} className="text-[color:var(--ui-positive)] shrink-0" aria-hidden />
          ) : (
            <TriangleAlert size={16} strokeWidth={2} className="text-[color:var(--ui-danger)] shrink-0" aria-hidden />
          )}
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
