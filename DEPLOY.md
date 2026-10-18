# Deployment Guide

This project deploys as three pieces on free tiers:

| Piece | Host | Notes |
|---|---|---|
| PostgreSQL database | **Supabase** (region `ap-south-1`, Mumbai) | Closest region to Bahrain. |
| Backend API (NestJS) | **Render** free web service (region `singapore`) | Persistent server — needed for file uploads and Tesseract OCR, which Vercel's serverless free tier cannot run reliably. Sleeps after ~15 min idle; first request after sleep takes ~30s. |
| Frontend (Vite/React) | **Vercel** free | Static site. |

Deploys are driven by pushing to the GitHub repo `fadhelfuhad/timezone-wll`. Render and Vercel both redeploy automatically on push to the default branch. No secrets are stored in the repo — they are set in each host's dashboard.

---

## 1. Database — Supabase

1. Sign in at https://supabase.com/dashboard and create a new project.
2. Region: **South Asia (Mumbai) — `ap-south-1`**. Set a strong database password and save it.
3. Once the project is ready, open **Project Settings → Database → Connection string** and copy two URIs:
   - **Transaction pooler** (host contains `pooler`, port `6543`) → this becomes `DATABASE_URL`. Append `?pgbouncer=true&connection_limit=1` to it.
   - **Direct connection** (port `5432`) → this becomes `DIRECT_URL`.
4. Keep both strings for the Render step.

The backend's Prisma schema uses `DATABASE_URL` at runtime (pooled) and `DIRECT_URL` for migrations (direct), because migrations cannot run through the pooler.

## 2. Backend — Render

1. Sign in at https://dashboard.render.com and choose **New → Blueprint**.
2. Connect the GitHub repo. Render reads `render.yaml` and proposes the `timezone-wll-api` web service.
3. Fill in the env vars marked "set in dashboard":
   - `DATABASE_URL` — Supabase pooled URI (port 6543).
   - `DIRECT_URL` — Supabase direct URI (port 5432).
   - `JWT_SECRET`, `JWT_REFRESH_SECRET` — two different random 32+ char strings (`openssl rand -hex 32`).
   - `CORS_ORIGINS` — the Vercel frontend URL (fill this after step 3; until then leave it as a placeholder, then update and redeploy).
   - `SEED_ADMIN_PASSWORD`, `SEED_STAFF_PASSWORD` — strong passwords for the two seeded accounts.
4. Deploy. The build runs `prisma migrate deploy` automatically, creating the schema.
5. Seed the database once (demo data + the two accounts). Either run the seed from a machine with the Supabase `DIRECT_URL` exported:
   ```bash
   cd backend
   DATABASE_URL="<direct url>" DIRECT_URL="<direct url>" \
     SEED_ADMIN_PASSWORD="..." SEED_STAFF_PASSWORD="..." \
     npx tsx prisma/seed.ts
   ```
6. Note the service URL, e.g. `https://timezone-wll-api.onrender.com`. Check `https://<url>/api/health` returns `{"status":"ok"}`.

## 3. Frontend — Vercel

1. Sign in at https://vercel.com/new and import the GitHub repo.
2. Set **Root Directory** to `frontend`. Vercel auto-detects Vite (build `vite build`, output `dist`).
3. Add an environment variable:
   - `VITE_API_URL` = the Render backend URL from step 2 (no trailing slash, no `/api`), e.g. `https://timezone-wll-api.onrender.com`.
4. Deploy. Note the Vercel URL, e.g. `https://timezone-wll.vercel.app`.

## 4. Connect the two

1. In Render, set `CORS_ORIGINS` to the exact Vercel URL from step 3 and redeploy the backend.
2. Open the Vercel URL, log in with the admin account, and confirm the dashboard loads data.

---

## Notes & limitations

- **Render free sleep**: the API sleeps after ~15 min of inactivity; the first request then takes ~30s while it wakes. The frontend will appear to hang briefly on first load.
- **Uploads are ephemeral**: `UPLOAD_DIR` is `/tmp/uploads`. Uploaded import files do not survive a restart. OCR processes them immediately, so this only matters if a restart happens mid-import.
- **OCR**: uses local Tesseract (`OCR_PROVIDER=tesseract`), no API key. Slower than cloud OCR but free.
- **Secrets**: never commit `.env`. Rotate `JWT_SECRET`/`JWT_REFRESH_SECRET` if they are ever exposed — doing so invalidates all issued tokens.
