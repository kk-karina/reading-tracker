-- Run in Supabase → SQL editor if the project was created before ratings existed.
alter table public.log_entries
  add column if not exists rating smallint check (rating between 1 and 5);
