-- Run in Supabase → SQL editor before deploying the app that calls it.
--
-- The learning hub shipped to production holding everything in localStorage:
-- one JSON string per browser, lost with the site data and invisible from the
-- next device. These four tables are the other half of it. Reading is not
-- touched — books, sessions and notes stay exactly as they are.
--
-- Safe to run again: everything here is "if not exists" or guarded.

create table if not exists public.streams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  -- The address, handed out once from the name. A rename must not break a link,
  -- so nothing updates this column after the insert.
  slug text not null,
  name text not null,
  -- The icon is stored without a check: the set of icons changes more often
  -- than it is worth a migration, and it is picked from a list, never typed.
  icon text not null,
  accent text check (accent is null or accent in
    ('lemon','sage','clay','slate','plum','sky','sand','rose')),
  goal text,
  -- What to sit down to, pointed at from the stream's side rather than flagged
  -- on the material: reading has one focus for the whole app, learning has one
  -- per stream, and a flag would mean walking the neighbours on every change.
  -- The foreign key is added below, once materials exists.
  focus_material_id uuid,
  outline text,
  sort integer not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Two streams may share a name; they may not share an address, or the second
-- one is unreachable. The client picks the next free suffix.
create unique index if not exists streams_slug on public.streams (user_id, slug);

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  stream_id uuid not null references public.streams(id) on delete cascade,
  title text not null,
  kind text not null check (kind in ('book','article','course','video')),
  author text,
  url text,
  -- Три состояния. Статус считается приложением из сделанного (см. `statusOf`
  -- в src/lib/learning/status.ts); здесь хранится только отметка «пройдено»,
  -- которую подсчётом не получить: у статьи и ролика считать нечего.
  -- Было четвёртым «dropped» — см. 004_three_statuses.sql.
  status text not null default 'backlog'
    check (status in ('backlog','active','done')),
  -- Kept as an address, not a picture: someone else's file lives on someone
  -- else's server anyway, and a drawn cover hides a dead link. A cover chosen
  -- from a file arrives here as a data: URL, downscaled by the app first.
  cover_url text,
  -- Only a book has a scale, and only a book measured in pages has the counts.
  scale text check (scale is null or scale in ('pages','parts')),
  pages_total integer,
  page_current integer,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The two tables point at each other, which no single "create table" expresses,
-- so the focus gets its key here. "on delete set null" is the rule "a deleted
-- material stops being anyone's focus" — in the database, where it holds even
-- for a row this app did not write.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'streams_focus_material') then
    alter table public.streams
      add constraint streams_focus_material
      foreign key (focus_material_id) references public.materials(id) on delete set null;
  end if;
end;
$$;

create table if not exists public.material_parts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  material_id uuid not null references public.materials(id) on delete cascade,
  -- An unnamed part is called by its number in order, which the screen works
  -- out from the sort. The database is not told the language that is in.
  title text not null default '',
  done boolean not null default false,
  sort integer not null default 0
);

create table if not exists public.study_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  material_id uuid not null references public.materials(id) on delete cascade,
  -- A note outlives the chapter it was written about, so the pointer goes to
  -- null rather than taking the note with it.
  part_id uuid references public.material_parts(id) on delete set null,
  -- The chapter as free text, from before chapters were a list. Only shown
  -- when part_id is empty.
  part text,
  title text,
  body text not null default '',
  -- A thought about a book carries one tag; a note is long and carries several.
  tags text[] not null default '{}'
    check (tags <@ array['quote','idea','question','disagree','feeling']),
  date date not null,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.streams enable row level security;
alter table public.materials enable row level security;
alter table public.material_parts enable row level security;
alter table public.study_notes enable row level security;

-- Policies have no "if not exists", so they are dropped first: running this
-- file a second time on a live database must not stop on its own first run.
drop policy if exists "own streams" on public.streams;
create policy "own streams" on public.streams
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own materials" on public.materials;
create policy "own materials" on public.materials
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own material parts" on public.material_parts;
create policy "own material parts" on public.material_parts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own study notes" on public.study_notes;
create policy "own study notes" on public.study_notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists streams_user_sort on public.streams (user_id, sort);
create index if not exists materials_stream on public.materials (user_id, stream_id, sort);
create index if not exists material_parts_material on public.material_parts (material_id, sort);
create index if not exists study_notes_material on public.study_notes (material_id, date desc);
