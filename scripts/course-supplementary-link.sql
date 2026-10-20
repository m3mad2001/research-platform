-- Run ONCE after scripts/courses-and-silo.sql. Existing courses remain unchanged.
begin;

alter table public.courses
  add column if not exists supplementary_url text;

alter table public.courses
  drop constraint if exists courses_supplementary_url_check;
alter table public.courses
  add constraint courses_supplementary_url_check
  check (supplementary_url is null or (
    length(supplementary_url) between 9 and 2048
    and supplementary_url ~* '^https://[^[:space:]/]+'));

commit;
