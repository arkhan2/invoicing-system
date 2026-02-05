-- Add city column to customers and vendors (Pakistan address)
alter table if exists public.customers
  add column if not exists city text;

alter table if exists public.vendors
  add column if not exists city text;
