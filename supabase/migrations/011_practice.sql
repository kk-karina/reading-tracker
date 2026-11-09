-- Practice, and "done" set only by hand.
--
-- A practice is a fifth kind of material: something you do rather than read
-- or watch. It has no link, no chapters and no pages; it is measured by the
-- minutes or by the number of times its sessions add up to, and may have a
-- target in those units.
--
-- With it, "done" stops being worked out from progress. A course with every
-- lecture ticked no longer closes itself: it closes when she says so, and can
-- be reopened, which a counted "done" never let her do. "Active" counts what
-- she took on explicitly (a stored 'active') as well as anything done.
--
-- Run in Supabase → SQL editor before deploying the app that writes practice.
-- Until then the app still loads and reads every material as without target.
-- Safe to run again: the one-time status fix below runs only together with
-- the column it ships with, so a second run cannot close again what was
-- reopened by hand.

alter table public.materials drop constraint if exists materials_kind_check;
alter table public.materials
  add constraint materials_kind_check
  check (kind in ('book','article','course','video','practice'));

-- A book counts pages or parts; a practice counts minutes or times.
alter table public.materials drop constraint if exists materials_scale_check;
alter table public.materials
  add constraint materials_scale_check
  check (scale is null or scale in ('pages','parts','minutes','times'));

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'materials' and column_name = 'target'
  ) then
    return;
  end if;

  -- Only a practice has a target: minutes for the minutes scale (typed in
  -- hours), a count for the times scale. Empty means no target.
  alter table public.materials add column target integer check (target is null or target > 0);

  -- What was finished by counting stays finished: every part ticked, or the
  -- page at the last one. Without this it would move to "active" under the
  -- new rule.
  update public.materials m
     set status = 'done', updated_at = now()
   where m.status <> 'done'
     and (
       (
         (m.kind = 'course' or (m.kind = 'book' and m.scale = 'parts'))
         and exists (select 1 from public.material_parts p where p.material_id = m.id)
         and not exists (select 1 from public.material_parts p where p.material_id = m.id and not p.done)
       )
       or (
         m.kind = 'book' and coalesce(m.scale, 'pages') = 'pages'
         and coalesce(m.pages_total, 0) > 0
         and coalesce(m.page_current, 0) >= m.pages_total
       )
     );

  -- A stored 'active' from the days of the hand-set status, with nothing
  -- done since, is shown in the backlog today: the old rule ignored it. The
  -- new one counts it, so it goes back to where she sees it now.
  update public.materials m
     set status = 'backlog', updated_at = now()
   where m.status = 'active'
     and not exists (select 1 from public.study_sessions s where s.material_id = m.id)
     and not exists (select 1 from public.study_notes n where n.material_id = m.id)
     and not exists (
       select 1 from public.material_parts p
        where p.material_id = m.id and p.done
          and (m.kind = 'course' or (m.kind = 'book' and m.scale = 'parts'))
     )
     and coalesce(m.page_current, 0) = 0;
end;
$$;
