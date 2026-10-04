-- A session of learning becomes a record of its own, the way a reading
-- session always was.
--
-- Until now a session was a note: progress logged without writing anything
-- left no trace in time, so the day did not count towards rhythm or streak,
-- and one sitting could hold one note at most. A session keeps the step it
-- took — pages from and to, the chapters closed, an article read through —
-- so deleting it can take that step back.
--
-- Notes point at their session and outlive it: deleting a session unlinks
-- its notes instead of taking them along, as with thoughts on a book.
--
-- Until this runs the app still loads: it reads a missing table as no
-- sessions, and leaves session_id out of a note it writes without one.

create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  material_id uuid not null references public.materials(id) on delete cascade,
  date date not null,
  -- Only for a book counted in pages.
  page_from integer,
  page_to integer,
  -- Chapters or lectures this session marked done. An array, not a join
  -- table: a sitting closes a handful, and they are read back together.
  part_ids uuid[] not null default '{}',
  -- Only for an article or a video: read or watched through in this sitting.
  completed boolean not null default false,
  minutes integer check (minutes is null or minutes > 0),
  rating smallint check (rating is null or rating between 1 and 5),
  created_at timestamptz not null default now()
);

alter table public.study_notes
  add column if not exists session_id uuid references public.study_sessions(id) on delete set null;

alter table public.study_sessions enable row level security;

drop policy if exists "own study sessions" on public.study_sessions;
create policy "own study sessions" on public.study_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists study_sessions_material on public.study_sessions (material_id, date desc);
create index if not exists study_notes_session on public.study_notes (session_id);
