-- Run in Supabase → SQL editor before deploying the app that calls it.
--
-- Choosing a focus is two changes — clear the old one, set the new one — and as
-- two separate requests a failure between them left the shelf with no focus at
-- all. That happened for real: PostgREST was rejecting tokens with
-- "JWT issued at future", and the second request was the one that lost.
--
-- A function is one transaction, so either both changes land or neither does.
-- They stay two statements inside it because books_one_focus is a plain unique
-- index, checked row by row: setting the new focus before clearing the old one
-- would trip it.
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
