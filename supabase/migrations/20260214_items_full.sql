-- =============================================================================
-- ITEMS TABLE - Full create/update
-- Run this to create items table from scratch or add missing columns
-- Depends on: companies, tax_rates, uom
-- =============================================================================

-- Create table (safe: if not exists)
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  description text,
  reference text,
  hs_code text,
  unit_rate decimal(12,4) default null,
  default_tax_rate_id uuid references public.tax_rates(id) on delete set null,
  uom_id uuid references public.uom(id) on delete set null,
  sale_type text default 'Goods at standard rate (default)',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add columns from incremental migrations (safe for existing tables)
alter table public.items add column if not exists reference text;
alter table public.items add column if not exists unit_rate decimal(12,4) default null;

-- Indexes
create index if not exists idx_items_company_id on public.items(company_id);
create index if not exists idx_items_default_tax_rate_id on public.items(default_tax_rate_id);
create index if not exists idx_items_uom_id on public.items(uom_id);

-- Row Level Security
alter table public.items enable row level security;

drop policy if exists "Users can manage items of own companies" on public.items;
create policy "Users can manage items of own companies"
  on public.items for all
  using (exists (
    select 1 from public.companies c
    where c.id = company_id and c.user_id = (select auth.uid())
  ));
