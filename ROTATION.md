# Secret Rotation & Release Runbook

**Why this exists:** `.env` was committed in the initial commit (`867e93d`) and that commit is on
`origin/master` of a **public** repository. `CRON_SECRET` and `VAPID_PRIVATE_KEY` from history are
byte-identical to the values still in use. Treat every secret in that file as public.

**Order matters.** Rotation first, deploy second. Deploying first leaves the leaked `CRON_SECRET`
working against a new build, and the app would sign sessions with it.

---

## Step 1 — Rotate secrets (do this first)

Fresh values were generated for you and saved to `%TEMP%\lcc-rotation.txt`:

| Key | Action |
|---|---|
| `SESSION_SECRET` | Copy the generated value → Vercel env |
| `CRON_SECRET` | Copy the generated value → Vercel env + GitHub Actions secret |
| `AI_API_KEY` | Issue a new key **at the AI provider dashboard** |
| `DATABASE_URL` password | Change the Postgres role password, then update `DATABASE_URL` in Vercel |
| `VAPID_*` | Optional — see the warning below |

### VAPID warning
The generated VAPID pair **invalidates every existing push subscription**. Notifications silently
stop until each device re-enables them in Profil. Only rotate if you actually must; the leaked
private key's realistic abuse is limited to sending you fake notifications, not reading data.

### Where to put them
- **Vercel** → Project → Settings → Environment Variables (all environments)
- **GitHub** → Repo → Settings → Secrets and variables → Actions → `CRON_SECRET`
  (the 10-minute cron pings `/api/cron`; a stale value here breaks all reminders)

---

## Step 2 — Purge `.env` from git history

Rotation is the real fix; this is cleanup so the secrets stop being readable.

```powershell
pip install git-filter-repo
cd C:\Users\maman\Desktop\Project\my.life
git filter-repo --path .env --invert-paths --force
git remote add origin https://github.com/debasedd/life-command-center.git
git push --force --mirror origin
```

Then on GitHub: Settings → General → Danger Zone → *Remove cached views* / contact support to purge
caches, since GitHub may still serve the old blobs.

> If the repo has other clones or forks, they must be re-cloned or force-pushed too.

**Also set the repository to private** — that alone stops the current exposure going forward.

---

## Step 3 — Deploy

Work is committed locally as `eb859fc` and **not yet pushed**.

```powershell
cd C:\Users\maman\Desktop\Project\my.life
git push origin master
```

If the Vercel project is linked to GitHub, that push triggers the deploy. Otherwise:

```powershell
npx vercel login
npx vercel --prod
```

Build command is `npm run vercel-build` (`prisma generate && next build`).
Apply migrations once against production:

```powershell
$env:DATABASE_URL = "<production url>"
npx prisma migrate deploy
```

**Never run `npm run db:push` against production** — it can silently drop columns.

---

## Step 4 — Verify the breach is closed

```powershell
# must return 401, not your data
curl -s -o NUL -w "%{http_code}" https://life-command-center-red.vercel.app/api/transactions

# must be 404 -> 200 (login page exists)
curl -s -o NUL -w "%{http_code}" https://life-command-center-red.vercel.app/login
```

Then in a browser: log in, confirm the dashboard loads, change the password
(Profil → Keamanan) away from `demo123`, and re-enable notifications if you rotated VAPID.

---

## Aftermath

- [ ] `CRON_SECRET` rotated (Vercel **and** GitHub Actions)
- [ ] `SESSION_SECRET` set in Vercel — **app fails closed without it**
- [ ] `AI_API_KEY` reissued at the provider
- [ ] DB password rotated, `DATABASE_URL` updated in Vercel
- [ ] History purged + repo set to private
- [ ] Pushed and deployed
- [ ] `/api/transactions` returns **401** anonymously
- [ ] Password changed from `demo123`
- [ ] Cron still delivering reminders (check a water/workout reminder fires)

---

## Note on the AI provider

`AI_BASE_URL` currently points at an endpoint returning **HTTP 530**, so the AI homework solver is
degraded. Everything else works. This was left untouched by request.