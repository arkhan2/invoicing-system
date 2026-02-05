-- =============================================================================
-- Schema updates for existing databases (idempotent)
-- Run in Supabase SQL Editor if your DB was created from an older schema.
-- Safe to run multiple times; uses ADD COLUMN IF NOT EXISTS where supported.
-- =============================================================================

-- Companies: city, gst_number (if missing)
alter table if exists public.companies
  add column if not exists city text,
  add column if not exists gst_number text;

-- Companies: logo_url (if missing)
alter table if exists public.companies
  add column if not exists logo_url text;

-- Customers: city (if missing)
alter table if exists public.customers
  add column if not exists city text;

-- Vendors: city (if missing)
alter table if exists public.vendors
  add column if not exists city text;
