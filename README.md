# slap that bass

A personal bass-practice log. It does not teach; it keeps track of where the time goes.

- **Progress** — total time, sessions, a rose of minutes per category, songs by status.
- **Topics** — the six categories from the brief, each with editable topics. Topics are never "done"; they only accumulate minutes.
- **Songs** — backlog / learning / learned, with optional slot and link.
- **Log** — manual entries after practice: category, optional topic, minutes, note, date.
- **Settings** — export, sample data (local mode), sign out.

## Run locally

```
npm install
npm run dev
```

Without Supabase keys the app runs in **local mode**: everything is stored in the browser, with JSON export/import in Settings.

## Supabase (accounts + sync)

1. Create a project at supabase.com.
2. SQL editor → paste and run `supabase/schema.sql`.
3. Authentication → Providers → Email: keep it on. Optionally turn off "Confirm email" for a single-user setup.
4. Copy `.env.example` to `.env.local` and fill in the URL and anon key from Project Settings → API.

## Deploy to GitHub Pages

1. Push to a GitHub repo, branch `main`.
2. Repo → Settings → Pages → Source: **GitHub Actions**.
3. Repo → Settings → Secrets and variables → Actions → add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (skip for local mode).
4. The workflow in `.github/workflows/deploy.yml` builds and publishes on every push.

The app uses hash routing (`/#/log`) so it works from any repo path without server config.
