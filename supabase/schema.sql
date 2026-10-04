-- Run in Supabase → SQL editor. Safe to run again: it creates what is missing
-- and leaves what is there alone.
--
-- Careful, though: "create table if not exists" skips an existing table whole,
-- so a column added to this file later never reaches a database that already
-- has the table. Those go in supabase/migrations/ and are run separately.
--
-- Three tables, each row owned by the signed-in user. RLS hides everyone else's rows.

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  author text,
  pages integer,
  cover_url text,
  -- Where the book lives online: a shop, a publisher, Goodreads. Added by
  -- migrations/006_book_url.sql.
  url text,
  external_id text,
  genre text,
  language text,
  -- Три состояния, и ни одного лишнего. Статус не ставят руками — его считает
  -- приложение из прочитанного (см. `statusOf` в src/lib/reading.ts); здесь
  -- хранится только отметка «прочитано», которую подсчётом не получить:
  -- у книги может быть неизвестно число страниц.
  status text not null default 'want'
    check (status in ('want','reading','finished')),
  is_focus boolean not null default false,
  rating smallint check (rating between 1 and 5),
  -- The review is one per book and written once, so it lives on the book
  -- rather than in a table of its own.
  review text,
  started_at date,
  finished_at date,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One book in focus per user; the database refuses a second one.
create unique index if not exists books_one_focus
  on public.books (user_id) where is_focus;

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  date date not null,
  -- page_from is stored, not derived: returning to a book left half-read would
  -- otherwise produce negative and phantom deltas.
  page_from integer not null,
  page_to integer not null check (page_to >= page_from),
  minutes integer check (minutes > 0),
  rating smallint check (rating between 1 and 5),
  created_at timestamptz not null default now()
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  page integer,
  tag text not null check (tag in ('quote','idea','question','disagree','feeling')),
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.books enable row level security;
alter table public.sessions enable row level security;
alter table public.notes enable row level security;

-- Policies have no "if not exists", so they are dropped first: running this
-- file a second time on a live database must not stop on the policy it wrote
-- the first time.
drop policy if exists "own books" on public.books;
create policy "own books" on public.books
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own sessions" on public.sessions;
create policy "own sessions" on public.sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own notes" on public.notes;
create policy "own notes" on public.notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists sessions_user_date on public.sessions (user_id, date desc);
create index if not exists sessions_book on public.sessions (book_id, date desc);
create index if not exists notes_book on public.notes (book_id, created_at desc);

-- Choosing a focus is two changes in one transaction, so a failure half way
-- cannot leave the shelf with no focus at all. Two statements rather than one
-- because books_one_focus above is a plain unique index, checked row by row.
create or replace function public.set_focus(book uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.books
     set is_focus = false, updated_at = now()
   where user_id = auth.uid() and is_focus;

  if book is not null then
    update public.books
       set is_focus = true, updated_at = now()
     where user_id = auth.uid() and id = book;
  end if;
end;
$$;

grant execute on function public.set_focus(uuid) to authenticated;

-- Learning: streams, materials, their parts and the notes written on them.
-- Added later than the three tables above, which is why the four of them live
-- in migrations/003_learning.sql as well — a database created before the
-- learning hub needs them, and "create table if not exists" above would have
-- skipped them silently.

create table if not exists public.streams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  -- The address, handed out once from the name. A rename must not break a link,
  -- so nothing updates this column after the insert.
  slug text not null,
  name text not null,
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
  status text not null default 'backlog'
    check (status in ('backlog','active','done','dropped')),
  -- Kept as an address, not a picture: someone else's file lives on someone
  -- else's server anyway, and a drawn cover hides a dead link. A cover chosen
  -- from a file arrives here as a data: URL, downscaled by the app first.
  cover_url text,
  -- Only a book has a scale, and only a book measured in pages has the counts.
  scale text check (scale is null or scale in ('pages','parts')),
  pages_total integer,
  page_current integer,
  -- The same book on the shelf. See migrations/008_book_link.sql.
  book_id uuid references public.books(id) on delete set null,
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
  -- Half done, set by hand. See migrations/009_started_parts.sql.
  started boolean not null default false,
  sort integer not null default 0
);

-- A sitting with a material: the step it took, so deleting it can take the
-- step back. See migrations/007_study_sessions.sql.
create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  material_id uuid not null references public.materials(id) on delete cascade,
  date date not null,
  page_from integer,
  page_to integer,
  part_ids uuid[] not null default '{}',
  -- Parts this session left half done. See 009.
  started_ids uuid[] not null default '{}',
  completed boolean not null default false,
  minutes integer check (minutes is null or minutes > 0),
  rating smallint check (rating is null or rating between 1 and 5),
  -- Its twin on the shelf, when the material is linked to a book. See 008.
  book_session_id uuid references public.sessions(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.study_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  material_id uuid not null references public.materials(id) on delete cascade,
  -- Notes outlive the session they were written in.
  session_id uuid references public.study_sessions(id) on delete set null,
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
alter table public.study_sessions enable row level security;
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
drop policy if exists "own study sessions" on public.study_sessions;
create policy "own study sessions" on public.study_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own study notes" on public.study_notes;
create policy "own study notes" on public.study_notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists streams_user_sort on public.streams (user_id, sort);
create index if not exists materials_stream on public.materials (user_id, stream_id, sort);
create index if not exists material_parts_material on public.material_parts (material_id, sort);
create index if not exists study_sessions_material on public.study_sessions (material_id, date desc);
create index if not exists study_notes_material on public.study_notes (material_id, date desc);
create index if not exists study_notes_session on public.study_notes (session_id);
create unique index if not exists materials_book on public.materials (book_id)
  where book_id is not null;
create unique index if not exists study_sessions_book_session on public.study_sessions (book_session_id)
  where book_session_id is not null;
