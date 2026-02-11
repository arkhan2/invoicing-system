-- Add missing columns to vendors so it matches customers structure
alter table public.vendors
  add column if not exists contact_person_name text,
  add column if not exists country text,
  add column if not exists registration_type text check (registration_type in ('Registered', 'Unregistered'));
