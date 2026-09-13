# reading tracker

A personal reading log. It does not recommend books; it remembers what you read
and what you took from it.

- **Progress** — the book in focus, pages and time, a reading rhythm, the year in
  books, and the thoughts you wrote down most recently.
- **Shelf** — want to read / reading / finished / set aside, covers out.
- **Book** — progress, time, pace, what is left, every session and every thought.
- **Journal** — sessions across all books.
- **Settings** — language, export, import, sign out.

The interface speaks Russian and English.

## Run it

```
npm install
npm run dev
```

Without Supabase keys the app runs in **local mode**: everything lives in the
browser, with JSON export and import in Settings. That is enough to use it on one
device, and it is the fastest way to try it.

```
npm test    # the reading arithmetic: pages, pace, streaks, shares
npm run build
```

## Accounts and sync (Supabase)

Needed only if you want the data on more than one device.

1. Create a project at [supabase.com](https://supabase.com) — the free tier is enough.
2. SQL Editor → paste and run `supabase/schema.sql`. It creates three tables and
   the row-level security policies that keep each account's rows to itself.
3. Authentication → Providers → Email stays on. For a single-user setup you can
   turn "Confirm email" off.
4. Copy `.env.example` to `.env.local` and fill in the URL and the anon key from
   Project Settings → API.

The anon key is meant to be public — it ends up in the built JavaScript either
way. What protects the data is row-level security, which is why every table has a
policy and no query is trusted to scope itself.

## Deploy (GitHub Pages)

1. Push to GitHub, branch `main`.
2. Repo → Settings → Pages → Source: **GitHub Actions**.
3. For accounts: Repo → Settings → Secrets and variables → Actions → add
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Skip this to publish in local
   mode.
4. `.github/workflows/deploy.yml` builds and publishes on every push to `main`.

GitHub Pages serves private repositories only on paid plans. On the free plan the
repository has to be public — or deploy to Netlify or Vercel instead, both of
which publish a private repository for free and want the same two environment
variables.

The app uses hash routing (`/#/shelf`) and a relative base, so it works from any
repository path without server configuration.

## Where the design lives

`docs/superpowers/specs/` holds the design document: the data model, what each
screen is for, and a running log of decisions that were changed and why.

## Credit

The interface, the store abstraction and the charts began as a fork of
[slap-that-bass](https://github.com/n0irn0ir/slap-that-bass), a practice log for
bass guitar. Its history is kept in this repository.
