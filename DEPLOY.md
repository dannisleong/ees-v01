# EES V0.1 — Production Deployment Guide

## Architecture

```
Partner Browser → Vercel (React frontend)
                ↓
                API calls to https://ees-api.up.railway.app/api/...
                ↓
                Railway (Express API + Prisma + PostgreSQL)
```

---

## Step 1: Push to GitHub

```bash
cd C:\Users\danni\Documents\kimi\workspace\ees-v01-alpha
git init
git add .
git commit -m "EES V0.1 pilot ready for deployment"
# Create a private repo on GitHub named 'ees-v01'
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/ees-v01.git
git push -u origin main
```

---

## Step 2: Deploy Backend to Railway

### 2.1 Create Railway project
1. Go to https://railway.app
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your `ees-v01` repository
4. Railway auto-detects Node.js

### 2.2 Add PostgreSQL
1. In your Railway project, click **New** → **Database** → **Add PostgreSQL**
2. Wait for the database to provision

### 2.3 Set environment variables
Go to your **Railway service** → **Variables** tab and add:

| Variable | Value | Source |
|---|---|---|
| `DATABASE_URL` | *auto-filled* | Click "Add Reference" → select your Postgres database |
| `JWT_SECRET` | `ees-production-jwt-secret-REPLACE-THIS` | Generate a strong random string |
| `NODE_ENV` | `production` | |
| `FRONTEND_URL` | *leave empty for now* | Will add after Vercel deploy |

### 2.4 Add build & start commands
In Railway service → **Settings** tab:

- **Build Command:** `npm install && npx prisma generate && npx prisma migrate deploy`
- **Start Command:** `node --loader ts-node/esm api/src/index.ts`

### 2.5 Deploy
Click **Deploy**. Railway will build and start your API.

### 2.6 Get your API URL
After deploy succeeds, Railway shows a public URL like:
```
https://ees-v01-production.up.railway.app
```
Copy this — you'll need it for Vercel.

### 2.7 Seed production data
In Railway dashboard → your service → **Shell** tab, run:

```bash
npx prisma migrate deploy
npx tsx api/src/seed.ts
npx tsx api/src/seed-pilot.ts
```

---

## Step 3: Deploy Frontend to Vercel

### 3.1 Create Vercel project
1. Go to https://vercel.com
2. Click **Add New Project** → Import your `ees-v01` GitHub repo

### 3.2 Configure build settings
- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`

### 3.3 Add environment variable
In Vercel project → **Settings** → **Environment Variables**, add:

| Name | Value |
|---|---|
| `VITE_API_URL` | `https://YOUR_RAILWAY_URL` (from Step 2.6) |

Example:
```
VITE_API_URL=https://ees-v01-production.up.railway.app/api
```

### 3.4 Deploy
Click **Deploy**. Vercel builds and hosts your frontend.

### 3.5 Get your frontend URL
Vercel provides a URL like:
```
https://ees-v01.vercel.app
```

---

## Step 4: Connect Backend to Frontend

### 4.1 Update Railway CORS
Go back to Railway → your service → **Variables** tab.

Add/update:
```
FRONTEND_URL=https://ees-v01.vercel.app
```

Redeploy the Railway service to apply CORS changes.

### 4.2 Test
1. Open `https://ees-v01.vercel.app`
2. Log in with `cammy@ees.sg` / `password123`
3. Confirm PRJ-2026-001 loads correctly

---

## Step 5: Security Hardening (Before Sharing)

### 5.1 Change default passwords
Do NOT share the app until you update the seed passwords.

Edit `api/src/seed.ts` and `api/src/seed-pilot.ts` — replace `password123` with strong passwords.

Then re-seed:
```bash
# In Railway Shell:
npx tsx api/src/seed.ts
npx tsx api/src/seed-pilot.ts
```

### 5.2 Remove seed endpoints from production
In `api/src/routes/auth.ts`, the `/seed` endpoint should be protected or removed.

Add this at the top of the `/seed` handler:
```ts
if (CONFIG.NODE_ENV === 'production') {
  return res.status(403).json({ error: 'Seed not allowed in production' });
}
```

### 5.3 Use strong JWT secret
Make sure `JWT_SECRET` in Railway is at least 32 random characters.

---

## Troubleshooting

| Issue | Fix |
|---|---|
| `CORS error` in browser | Add your Vercel URL to Railway `FRONTEND_URL` variable |
| `Cannot connect to database` | Check `DATABASE_URL` is correctly linked to Railway Postgres |
| `Prisma Client not found` | Ensure `npx prisma generate` is in Railway Build Command |
| `404 on API routes` | Confirm Railway URL ends with `/api` and Vite `VITE_API_URL` is set |
| `Vercel build fails` | Check that `vite.config.ts` has `base: '/'` and build outputs to `dist/` |

---

## Cost Estimate (Free Tiers)

| Service | Free Tier Limit | EES V0.1 Usage |
|---|---|---|
| **Railway** | $5/month credit | ~$2-3/month for API + Postgres |
| **Vercel** | 100GB bandwidth | Well within free limits |
| **Total** | | **~$0-3/month** for pilot demo |

If Railway free credit runs out, alternatives: **Render** (free web service + free Postgres for 90 days) or **Fly.io**.

---

## Next Steps After Pilot

1. Set up custom domain (e.g., `pilot.ees.sg`)
2. Add HTTPS-only enforcement
3. Set up automated backups for PostgreSQL
4. Add Sentry or LogRocket for error monitoring
5. Migrate from pilot seed to real user registration flow
