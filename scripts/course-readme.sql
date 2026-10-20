-- Run after scripts/courses-and-silo.sql. Safe to rerun.
-- A README is stored as course text, so existing course RLS protects it.
begin;

alter table public.courses
  add column if not exists readme_markdown text not null default '';

alter table public.courses
  drop constraint if exists courses_readme_markdown_size_check;
alter table public.courses
  add constraint courses_readme_markdown_size_check
  check (octet_length(readme_markdown) <= 131072);

commit;
