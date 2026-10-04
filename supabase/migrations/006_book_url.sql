-- A book gets a link, the way a material of learning already has one.
--
-- Adding a book and adding a material are now one form: it starts from a link
-- and a sparkle that fills the rest in from it. The link is kept afterwards,
-- so editing the book shows where it came from and the book page can link out
-- to the shop or the publisher.
--
-- Nullable and without a default: most books on the shelf were typed in by
-- hand and have no page of their own anywhere. Until this runs the app still
-- saves books — it leaves the key out of the write when the link is empty.

alter table public.books add column if not exists url text;
