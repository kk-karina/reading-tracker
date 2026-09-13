-- Run once in Supabase → SQL editor.
-- Three tables, each row owned by the signed-in user. RLS hides everyone else's rows.

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  author text,
  pages integer,
  cover_url text,
  external_id text,
  genre text,
  language text,
  status text not null default 'want'
    check (status in ('want','reading','finished','abandoned')),
  is_focus boolean not null default false,
  rating smallint check (rating between 1 and 5),
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

create policy "own books" on public.books
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own sessions" on public.sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own notes" on public.notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists sessions_user_date on public.sessions (user_id, date desc);
create index if not exists sessions_book on public.sessions (book_id, date desc);
create index if not exists notes_book on public.notes (book_id, created_at desc);
