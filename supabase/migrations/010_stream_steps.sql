-- Steps towards a stream's goal, each with a prize.
--
-- The stream's goal stays its north star; steps are the ladder to it. The
-- prize is something she promises herself, and the app only announces it at
-- the moment the step is done — whether she went for it is not the app's
-- business, so there is no column for that.
--
-- The main prize is a place, not a flag: it is always the last step by sort.
-- Reordering moves it with no row to rewrite.
--
-- Until this runs the app still loads: a missing table reads as a stream
-- with no steps.

create table if not exists public.stream_steps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  stream_id uuid not null references public.streams(id) on delete cascade,
  title text not null default '',
  prize text not null default '',
  wish text not null default '',
  -- A picture from the set shipped with the app, by id ('h01', 'o03'…). Empty
  -- means the default one; the set lives in code, not here.
  image text,
  sort integer not null default 0,
  -- The day the step was done. Empty — not done yet. Done steps always come
  -- first in order; the screen keeps it that way.
  done_on date,
  created_at timestamptz not null default now()
);

create index if not exists stream_steps_stream on public.stream_steps (stream_id, sort);

alter table public.stream_steps enable row level security;

-- Policies have no "if not exists", so they are dropped first: running this
-- file a second time must not stop on its own first run.
drop policy if exists "own steps" on public.stream_steps;
create policy "own steps" on public.stream_steps
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
