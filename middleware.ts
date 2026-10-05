import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge gate: reject unauthenticated traffic before it reaches a route or the DB.
 *
 * Cookie format matches lib/auth.ts: base64url(payload).base64url(hmac-sha256),
 * signed with SESSION_SECRET (falling back to CRON_SECRET). Verification here is
 * deliberately duplicated in a small, dependency-free form because middleware
 * runs on the Edge runtime where node:crypto is unavailable.
 */

const COOKIE_NAME = "lcc_session";

/** Routes reachable without a session. */
const PUBLIC_PREFIXES = [
  "/api/auth/login",
  "/api/cron", // authenticated by CRON_SECRET in the route itself
  "/login",
  "/offline-ready", // PWA offline fallback target
];

function base64urlToBuf(input: string): Uint8Array {
  const norm = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = norm + "=".repeat((4 - (norm.length % 4)) % 4);
  const binary = atob(padded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function verifySession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const secret = process.env.SESSION_SECRET || process.env.CRON_SECRET;
  // Fail closed: without a signing key nothing can be trusted.
  if (!secret) return false;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const key = await importKey(secret);
  const ok = await hmacVerify(key, sig, payload);
  if (!ok) return false;
  try {
    const data = JSON.parse(new TextDecoder().decode(base64urlToBuf(payload))) as {
      uid?: string;
      exp?: number;
    };
    return !!data.uid && typeof data.exp === "number" && Date.now() < data.exp;
  } catch {
    return false;
  }
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
}

async function hmacVerify(key: CryptoKey, sigB64url: string, payload: string): Promise<boolean> {
  try {
    const signature = base64urlToBuf(sigB64url);
    return await crypto.subtle.verify(
      "HMAC",
      key,
      signature as unknown as BufferSource,
      new TextEncoder().encode(payload)
    );
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  // Browsers send the cookie; iOS Shortcuts send `Authorization: Bearer <token>`.
  let token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    const header = req.headers.get("authorization");
    if (header && /^Bearer\s+/i.test(header)) token = header.replace(/^Bearer\s+/i, "").trim();
  }

  if (await verifySession(token)) return NextResponse.next();

  // API consumers get a clean 401; browsers get sent to the login page.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  // Skip static assets and the PWA entry points that must stay reachable.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icon.svg|icons/).*)"],
};