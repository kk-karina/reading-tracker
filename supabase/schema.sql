-- Run once in Supabase → SQL editor.
-- Three tables, each row owned by the signed-in user. RLS hides everyone else's rows.

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category text not null,
  title text not null,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  artist text not null,
  title text not null,
  status text not null default 'backlog' check (status in ('backlog','learning','learned')),
  link text,
  slot text check (slot in ('easy','growth','dream')),
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.log_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null,
  category text not null,
  topic_id uuid references public.topics(id) on delete set null,
  minutes integer not null check (minutes > 0),
  note text,
  rating smallint check (rating between 1 and 5),
  created_at timestamptz not null default now()
);

alter table public.topics enable row level security;
alter table public.songs enable row level security;
alter table public.log_entries enable row level security;

create policy "own topics" on public.topics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own songs" on public.songs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own log" on public.log_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists log_entries_user_date on public.log_entries (user_id, date desc);
