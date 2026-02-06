-- Add project name and subject to estimates
alter table public.estimates
  add column if not exists project_name text,
  add column if not exists subject text;
