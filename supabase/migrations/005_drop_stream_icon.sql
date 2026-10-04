-- The stream icon is gone; the stream's colour is its only mark now.
--
-- In the switcher the icon sat as a prefix to the name and was sized by that
-- name's type size: the active stream's name is 32px, so an icon drawn on a
-- 24 grid for a 2px stroke stretched to 29 while its neighbours stayed at 15.
-- The row came apart both in size and in height, and there was nothing worth
-- fixing: the icon carried no information the full name beside it did not.
-- The accent does carry it — "the green one" is found at a glance, "the one
-- with the compass" has to be read.
--
-- Dropped rather than left behind: a column nothing writes and nothing reads
-- is the kind of thing a later reader has to disprove.

alter table public.streams drop column if exists icon;
