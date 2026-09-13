-- Run once in Supabase → SQL editor, on a database created before the review tab.
-- Fresh installs already get this column from schema.sql.
alter table public.books add column if not exists review text;
