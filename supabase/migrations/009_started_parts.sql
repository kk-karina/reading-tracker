-- A chapter or a lecture can be half done.
--
-- A part already had a third look — "started", a dot with a core — but only
-- as a derived one: a note written about it, no mark. Now it can be set by
-- hand, and a study session remembers the parts it left started, so deleting
-- the session takes that step back too, as it does with the parts it closed.
--
-- Being done does not clear "started": undoing the done mark returns the
-- part to started, which is what it was.
--
-- Until this runs the app still loads: it reads the missing columns as
-- nothing started, and leaves them out of a row it writes without any.

alter table public.material_parts
  add column if not exists started boolean not null default false;

alter table public.study_sessions
  add column if not exists started_ids uuid[] not null default '{}';
