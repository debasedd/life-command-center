"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, TriangleAlert, Eye, EyeOff, LogIn } from "lucide-react";

const FIELD =
  "w-full rounded-control bg-[color:var(--ui-surface)] border border-[color:var(--ui-border)] px-3.5 py-3 text-base text-[color:var(--ui-text)] placeholder-[color:var(--ui-text-muted)] outline-none transition-[border-color,box-shadow] duration-[180ms] focus:border-[color:var(--ui-focus-ring)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.12)]";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Already signed in? Skip the form.
  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((r) => {
        if (r.ok) router.replace("/home");
      })
      .catch(() => {});
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setErr("");
    if (!email.trim() || !password) {
      setErr("Email dan password wajib diisi.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error || "Gagal masuk.");
        setBusy(false);
        return;
      }
      // Full navigation so the middleware re-evaluates with the new cookie.
      window.location.assign("/home");
    } catch {
      setErr("Tidak bisa menghubungi server.");
      setBusy(false);
return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 safe-top safe-bottom">
      <div className="w-full max-w-sm fade-rise">
        {/* Mark — same geometry as the app icon */}
        <svg width="52" height="52" viewBox="0 0 512 512" aria-hidden className="mb-5">
          <rect width="512" height="512" rx="112" fill="#111113" />
          <rect x="96" y="160" width="320" height="46" rx="23" fill="#ffffff" />
          <rect x="96" y="233" width="230" height="46" rx="23" fill="#ffffff" opacity="0.78" />
          <rect x="96" y="306" width="150" height="46" rx="23" fill="#ffffff" opacity="0.55" />
        </svg>

        <h1 className="display mb-1">Life Command Center</h1>
        <p className="text-sm text-muted mb-7">Masuk untuk membuka data pribumumu.</p>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="kicker block mb-1.5" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={FIELD}
              placeholder="nama@email.com"
              required
            />
          </div>

          <div>
            <label className="kicker block mb-1.5" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={show ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${FIELD} pr-11`}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Sembunyikan password" : "Tampilkan password"}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 text-[color:var(--ui-text-muted)] hover:text-[color:var(--ui-text)] transition-colors duration-[180ms]"
              >
                {show ? <EyeOff size={17} strokeWidth={1.75} /> : <Eye size={17} strokeWidth={1.75} />}
              </button>
            </div>
          </div>

          {err && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-control border border-[color:var(--ui-danger)]/30 bg-[color:var(--ui-danger-soft)] px-3 py-2.5 text-[13px] text-[color:var(--ui-danger)] fade-in"
            >
              <TriangleAlert size={15} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden />
              <span>{err}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full inline-flex items-center justify-center gap-2 rounded-control bg-[color:var(--ui-primary)] hover:bg-[color:var(--ui-primary-hover)] text-[color:var(--ui-on-primary)] px-4 py-3 text-sm font-semibold press transition-[background-color,opacity] duration-[180ms] shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-card)] disabled:opacity-50"
          >
            {busy ? (
              "Memeriksa…"
            ) : (
              <>
                <LogIn size={16} strokeWidth={2} aria-hidden />
                Masuk
              </>
            )}
          </button>
        </form>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-[color:var(--ui-text-muted)]">
          <CircleCheck size={12} strokeWidth={2} aria-hidden />
          Data tersimpan di server pribumumu sendiri
        </p>
      </div>
    </main>
  );
}
    }
  }