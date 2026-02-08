-- Add contact person name and country to customers (Pakistan is form default only, not DB default)
alter table if exists public.customers
  add column if not exists contact_person_name text,
  add column if not exists country text;
