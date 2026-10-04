-- One book in two places: on the shelf and in a stream of learning.
--
-- Until now a book kept in both was two unrelated rows, and a sitting logged
-- on one side never reached the other: pages read in a stream did not count
-- on the reading dashboard. Now a material may point at its book on the
-- shelf, and each study session with pages at its twin reading session. The
-- app writes both rows of a pair (see src/lib/twin.ts).
--
-- The link lives on the learning side only. Reading tables are not touched,
-- as in 003.
--
-- "on delete set null", not cascade: deleting a reading session must also
-- take its step back on the material, which only the app knows how to do. A
-- deleted book leaves the material standing with its own sessions.
--
-- Until this runs the app still loads: it reads the missing columns as no
-- link, and leaves them out of a row it writes without one.

alter table public.materials
  add column if not exists book_id uuid references public.books(id) on delete set null;

-- A book is linked with one material at most: a sitting mirrors to one place.
create unique index if not exists materials_book on public.materials (book_id)
  where book_id is not null;

alter table public.study_sessions
  add column if not exists book_session_id uuid references public.sessions(id) on delete set null;

create unique index if not exists study_sessions_book_session on public.study_sessions (book_session_id)
  where book_session_id is not null;
