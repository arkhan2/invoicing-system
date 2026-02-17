-- Add reference field to items
alter table public.items
  add column if not exists reference text;
