-- Existing installs: run this in the Supabase SQL Editor after courses-and-silo.sql.
-- The old SELECT policy calls a STABLE function that queries courses by ID.
-- During INSERT ... RETURNING, that function cannot see the row being inserted.
-- Evaluate the row's status and author directly instead. This does not broaden access.
begin;

drop policy if exists "Allowed users read published courses, authors read drafts" on public.courses;

create policy "Allowed users read published courses, authors read drafts" on public.courses
  for select to authenticated using (
    (select public.can_access_courses()) and (
      status = 'published' or (select public.is_platform_admin())
      or (author_id = (select auth.uid()) and (select public.can_create_courses()))));

commit;
