"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Btn, Input, toast } from "@/components/ui";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "register" ? { email, name, password } : { email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal");
      router.push("/home");
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error", "err");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {mode === "register" && (
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Nama</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama kamu" required />
        </div>
      )}
      <div>
        <label className="text-xs text-zinc-400 mb-1 block">Email</label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@contoh.com" required />
      </div>
      <div>
        <label className="text-xs text-zinc-400 mb-1 block">Password</label>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
      </div>
      <Btn type="submit" disabled={busy} className="w-full py-3 mt-2">
        {busy ? "Memproses…" : mode === "login" ? "Masuk" : "Daftar"}
      </Btn>
      <p className="text-center text-sm text-zinc-500 pt-2">
        {mode === "login" ? (
          <>
            Belum punya akun?{" "}
            <Link href="/register" className="text-indigo-400 font-semibold">
              Daftar
            </Link>
          </>
        ) : (
          <>
            Sudah punya akun?{" "}
            <Link href="/login" className="text-indigo-400 font-semibold">
              Masuk
            </Link>
          </>
        )}
      </p>
    </form>
  );
}