# Life Command Center (my.life)

Personal Life OS as an installable PWA — academics, finance, health, and AI homework help.
Designed for iPhone Safari (Add to Home Screen).

---

## Stack

Next.js 15 (App Router) · React 19 · TypeScript (strict) · Prisma 6 · PostgreSQL · Tailwind 3 · Vercel

---

## Auth model (single user)

Password login with a **stateless HMAC-signed session cookie** (`lcc_session`, httpOnly, SameSite=Lax,
30-day TTL). There is no session table — the cookie carries `{uid, exp}` plus an HMAC-SHA256
signature, verified twice: in `middleware.ts` (Edge, before the route runs) and in `getAuthUserId()`
(Node runtime, which also confirms the user still exists).

All 24 API routes already called `getAuthUserId()` and 401'd on falsy, so **they required no changes**.

### Signing key
`SESSION_SECRET` (falls back to `CRON_SECRET`). Both middleware and `lib/auth.ts` **fail closed**
if neither is set — an unsigned session must never be accepted.

### First login
The seeded account is `demo@lifec.id` / `demo123` unless `SEED_PASSWORD` overrides it.
**Change it from Profil → Keamanan immediately.** That flow does not require the current password
while the account still holds a placeholder hash, so a fresh deploy can't be locked out.

---

## Required environment

| Key | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Signs session cookies (**required**) |
| `CRON_SECRET` | Authenticates `/api/cron`; fallback session key |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | Web Push |
| `AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL` | AI provider (vision + solve) |
| `SEED_PASSWORD` | Optional; seed password override |

Generate a session secret:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

---

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server (port 3000, turbopack) |
| `npm run build` / `npm start` | Production build & serve |
| `npm run type-check` | `tsc --noEmit` |
| `npm run db:migrate` | **Apply migrations (use this in production)** |
| `npm run db:migrate:dev` | Create a new migration from schema changes |
| `npm run db:push` | ⚠️ Prototype only — never against production |
| `npm run seed` | Seed demo user + sample data |
| `npm run gen:vapid` | Generate a VAPID keypair |

> **Schema changes:** edit `prisma/schema.prisma`, then `npm run db:migrate:dev` to generate a
> migration under `prisma/migrations/`. Do not use `db push` on production — it can silently drop
> columns. `prisma/migrations/20260101000000_init/migration.sql` is the reviewed baseline.

---

## Deploy

Vercel project: `life-command-center` (`prj_fwgI7KRH8sV8XdCLEOsEnzppzfGf`).

1. Set every env var above in the Vercel dashboard.
2. Build command is `npm run vercel-build` (`prisma generate && next build`).
3. Deploy. Migrations are applied manually via `npm run db:migrate` — do not use `db push`.

### Notification scheduling
`vercel.json` runs `/api/cron` **daily at 22:00 UTC**. That is far too coarse for the
water/workout/recap reminders, so `.github/workflows/lcc-cron.yml` pings the same endpoint every
**10 minutes** with `Authorization: Bearer $CRON_SECRET`. Both hit the same idempotent, 30-minute
window logic, so running both is safe. **If you ever remove the GitHub Actions fallback, the
reminders effectively stop working.**

---

## Security posture

- `middleware.ts` gates every route and `/api/*` (401 for APIs, redirect to `/login` for pages).
  Public: `/login`, `/api/auth/login`, `/api/cron` (secret-gated), `/offline-ready`, PWA assets.
- `/api/cron` **fails closed**: 503 if `CRON_SECRET` is unset, 403 on mismatch.
- Login is throttled (8 attempts / 10 min / IP) and password comparison is constant-time (`timingSafeEqual`).
- Security headers (`X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS in prod)
  plus `no-store` on `/sw.js`.
- Secrets are git-ignored. **Never commit `.env`** — see "Secret rotation" below.

### Secret rotation
Because `.env` was committed in an early commit, **treat every secret in it as public and rotate**:

1. Rotate `CRON_SECRET`, `SESSION_SECRET`, `AI_API_KEY`, and the DB password.
2. `npm run gen:vapid` → update `VAPID_*`. **This invalidates all push subscriptions**; users must
   re-enable notifications in Profil afterwards.
3. Purge `.env` from git history (`git filter-repo --path .env --invert-paths`) and force-push.
   Rotation is still required — history rewriting alone does not un-publish a leaked key.
4. Set the repo to **private**.

---

## iOS Shortcuts

The two shortcuts POST directly to `/api/tasks/ai` and `/api/share/photo` and **send no session
cookie**, so they will receive `401` while auth is enabled. To keep them working, send the session
value as a header:

```
Authorization: Bearer <value-of-lcc_session-cookie>
```

Setup instructions live in-app under **Profil → Panduan**.

---

## Testing

```bash
npm run type-check          # must be clean
npm run build               # must succeed
node scripts/test-features.js   # integration suite (46 checks)
node scripts/test-notifications.js
```

`scripts/test-features.js` predates the auth work and expects unauthenticated access; it needs a
valid session cookie to run against a current build.