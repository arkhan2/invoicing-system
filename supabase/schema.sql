-- =============================================================================
-- Sales & Purchase Invoicing System - Supabase Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- =============================================================================

-- =============================================================================
-- CORE
-- =============================================================================

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  ntn text,
  cnic text,
  address text,
  province text,
  registration_type text check (registration_type in ('Registered', 'Unregistered')),
  phone text,
  email text,
  sales_invoice_prefix text default 'INV',
  sales_invoice_next_number int default 1,
  purchase_invoice_prefix text default 'PUR',
  purchase_invoice_next_number int default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  ntn_cnic text,
  address text,
  province text,
  registration_type text check (registration_type in ('Registered', 'Unregistered')),
  phone text,
  email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  ntn_cnic text,
  address text,
  province text,
  phone text,
  email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =============================================================================
-- TAX & UOM
-- =============================================================================

create table if not exists public.tax_rates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  rate_value decimal(5,2) not null,
  rate_label text not null,
  is_default boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.uom (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text not null
);

-- Seed UOM (safe to run multiple times - ignores duplicates)
insert into public.uom (code, description)
values
  ('KG', 'Kilogram'),
  ('Nos', 'Numbers, pieces, units'),
  ('Ltr', 'Litre'),
  ('Meter', 'Meter'),
  ('Box', 'Box'),
  ('Packet', 'Packet')
on conflict (code) do nothing;

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  description text,
  hs_code text,
  default_tax_rate_id uuid references public.tax_rates(id) on delete set null,
  uom_id uuid references public.uom(id) on delete set null,
  sale_type text default 'Goods at standard rate (default)',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =============================================================================
-- SALES INVOICES
-- =============================================================================

create table if not exists public.sales_invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  invoice_number text not null,
  invoice_date date not null,
  invoice_type text default 'Sale Invoice' check (invoice_type in ('Sale Invoice', 'Debit Note')),
  invoice_ref_no text,
  status text default 'Draft' check (status in ('Draft', 'Final', 'Sent')),
  fbr_irn text,
  fbr_status text,
  fbr_sent_at timestamptz,
  total_amount decimal(12,2) default 0,
  total_tax decimal(12,2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(company_id, invoice_number)
);

create table if not exists public.sales_invoice_items (
  id uuid primary key default gen_random_uuid(),
  sales_invoice_id uuid not null references public.sales_invoices(id) on delete cascade,
  item_id uuid references public.items(id) on delete set null,
  product_description text not null,
  hs_code text not null,
  rate_label text not null,
  uom text not null,
  quantity decimal(12,4) not null,
  unit_price decimal(12,4) not null,
  value_sales_excluding_st decimal(12,2) not null,
  sales_tax_applicable decimal(12,2) default 0,
  sales_tax_withheld_at_source decimal(12,2) default 0,
  extra_tax decimal(12,2) default 0,
  further_tax decimal(12,2) default 0,
  discount decimal(12,2) default 0,
  total_values decimal(12,2) not null,
  sale_type text default 'Goods at standard rate (default)',
  sro_schedule_no text,
  sro_item_serial_no text,
  sort_order int default 0,
  created_at timestamptz default now()
);

create table if not exists public.sales_invoice_payments (
  id uuid primary key default gen_random_uuid(),
  sales_invoice_id uuid not null references public.sales_invoices(id) on delete cascade,
  amount decimal(12,2) not null,
  deducted_tax boolean default false,
  deducted_tax_amount decimal(12,2) default 0,
  mode_of_payment text not null check (mode_of_payment in ('Cash', 'Bank Transfer', 'Cheque', 'Card', 'Online', 'Other')),
  reference_payment_id text,
  payment_date date not null,
  notes text,
  created_at timestamptz default now()
);

-- =============================================================================
-- PURCHASE INVOICES
-- =============================================================================

create table if not exists public.purchase_invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete restrict,
  invoice_number text not null,
  invoice_date date not null,
  status text default 'Draft' check (status in ('Draft', 'Final')),
  total_amount decimal(12,2) default 0,
  total_tax decimal(12,2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(company_id, invoice_number)
);

create table if not exists public.purchase_invoice_items (
  id uuid primary key default gen_random_uuid(),
  purchase_invoice_id uuid not null references public.purchase_invoices(id) on delete cascade,
  item_id uuid references public.items(id) on delete set null,
  product_description text not null,
  quantity decimal(12,4) not null,
  unit_price decimal(12,4) not null,
  tax_amount decimal(12,2) default 0,
  total_amount decimal(12,2) not null,
  sort_order int default 0,
  created_at timestamptz default now()
);

create table if not exists public.purchase_invoice_payments (
  id uuid primary key default gen_random_uuid(),
  purchase_invoice_id uuid not null references public.purchase_invoices(id) on delete cascade,
  amount decimal(12,2) not null,
  deducted_tax boolean default false,
  deducted_tax_amount decimal(12,2) default 0,
  mode_of_payment text not null check (mode_of_payment in ('Cash', 'Bank Transfer', 'Cheque', 'Card', 'Online', 'Other')),
  reference_payment_id text,
  payment_date date not null,
  notes text,
  created_at timestamptz default now()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

create index if not exists idx_companies_user_id on public.companies(user_id);
create index if not exists idx_customers_company_id on public.customers(company_id);
create index if not exists idx_vendors_company_id on public.vendors(company_id);
create index if not exists idx_items_company_id on public.items(company_id);
create index if not exists idx_tax_rates_company_id on public.tax_rates(company_id);
create index if not exists idx_sales_invoices_company_id on public.sales_invoices(company_id);
create index if not exists idx_sales_invoices_customer_id on public.sales_invoices(customer_id);
create index if not exists idx_sales_invoices_invoice_date on public.sales_invoices(invoice_date);
create index if not exists idx_sales_invoice_items_sales_invoice_id on public.sales_invoice_items(sales_invoice_id);
create index if not exists idx_sales_invoice_payments_sales_invoice_id on public.sales_invoice_payments(sales_invoice_id);
create index if not exists idx_purchase_invoices_company_id on public.purchase_invoices(company_id);
create index if not exists idx_purchase_invoices_vendor_id on public.purchase_invoices(vendor_id);
create index if not exists idx_purchase_invoice_items_purchase_invoice_id on public.purchase_invoice_items(purchase_invoice_id);
create index if not exists idx_purchase_invoice_payments_purchase_invoice_id on public.purchase_invoice_payments(purchase_invoice_id);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

alter table public.companies enable row level security;
alter table public.customers enable row level security;
alter table public.vendors enable row level security;
alter table public.tax_rates enable row level security;
alter table public.items enable row level security;
alter table public.sales_invoices enable row level security;
alter table public.sales_invoice_items enable row level security;
alter table public.sales_invoice_payments enable row level security;
alter table public.purchase_invoices enable row level security;
alter table public.purchase_invoice_items enable row level security;
alter table public.purchase_invoice_payments enable row level security;
alter table public.uom enable row level security;

-- Drop existing policies if re-running (optional - comment out if first run)
drop policy if exists "Users can manage own companies" on public.companies;
drop policy if exists "Users can manage customers of own companies" on public.customers;
drop policy if exists "Users can manage vendors of own companies" on public.vendors;
drop policy if exists "Users can manage tax_rates of own companies" on public.tax_rates;
drop policy if exists "Users can manage items of own companies" on public.items;
drop policy if exists "Users can manage sales_invoices of own companies" on public.sales_invoices;
drop policy if exists "Users can manage sales_invoice_items of own companies" on public.sales_invoice_items;
drop policy if exists "Users can manage sales_invoice_payments of own companies" on public.sales_invoice_payments;
drop policy if exists "Users can manage purchase_invoices of own companies" on public.purchase_invoices;
drop policy if exists "Users can manage purchase_invoice_items of own companies" on public.purchase_invoice_items;
drop policy if exists "Users can manage purchase_invoice_payments of own companies" on public.purchase_invoice_payments;
drop policy if exists "Authenticated users can read uom" on public.uom;

create policy "Users can manage own companies"
  on public.companies for all
  using (auth.uid() = user_id);

create policy "Users can manage customers of own companies"
  on public.customers for all
  using (exists (select 1 from public.companies c where c.id = company_id and c.user_id = auth.uid()));

create policy "Users can manage vendors of own companies"
  on public.vendors for all
  using (exists (select 1 from public.companies c where c.id = company_id and c.user_id = auth.uid()));

create policy "Users can manage tax_rates of own companies"
  on public.tax_rates for all
  using (exists (select 1 from public.companies c where c.id = company_id and c.user_id = auth.uid()));

create policy "Users can manage items of own companies"
  on public.items for all
  using (exists (select 1 from public.companies c where c.id = company_id and c.user_id = auth.uid()));

create policy "Users can manage sales_invoices of own companies"
  on public.sales_invoices for all
  using (exists (select 1 from public.companies c where c.id = company_id and c.user_id = auth.uid()));

create policy "Users can manage sales_invoice_items of own companies"
  on public.sales_invoice_items for all
  using (exists (select 1 from public.sales_invoices si join public.companies c on c.id = si.company_id where si.id = sales_invoice_id and c.user_id = auth.uid()));

create policy "Users can manage sales_invoice_payments of own companies"
  on public.sales_invoice_payments for all
  using (exists (select 1 from public.sales_invoices si join public.companies c on c.id = si.company_id where si.id = sales_invoice_id and c.user_id = auth.uid()));

create policy "Users can manage purchase_invoices of own companies"
  on public.purchase_invoices for all
  using (exists (select 1 from public.companies c where c.id = company_id and c.user_id = auth.uid()));

create policy "Users can manage purchase_invoice_items of own companies"
  on public.purchase_invoice_items for all
  using (exists (select 1 from public.purchase_invoices pi join public.companies c on c.id = pi.company_id where pi.id = purchase_invoice_id and c.user_id = auth.uid()));

create policy "Users can manage purchase_invoice_payments of own companies"
  on public.purchase_invoice_payments for all
  using (exists (select 1 from public.purchase_invoices pi join public.companies c on c.id = pi.company_id where pi.id = purchase_invoice_id and c.user_id = auth.uid()));

create policy "Authenticated users can read uom"
  on public.uom for select
  to authenticated
  using (true);

-- =============================================================================
-- OPTIONAL: FBR submission log (for Phase 6 - middleware)
-- =============================================================================

create table if not exists public.fbr_submission_log (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id),
  sales_invoice_id uuid references public.sales_invoices(id),
  action text not null,
  request_payload jsonb,
  response_payload jsonb,
  status_code int,
  created_at timestamptz default now()
);

alter table public.fbr_submission_log enable row level security;

drop policy if exists "Users can read own company fbr log" on public.fbr_submission_log;
create policy "Users can read own company fbr log"
  on public.fbr_submission_log for select
  using (exists (select 1 from public.companies c where c.id = company_id and c.user_id = auth.uid()));

-- Service role will insert from middleware; no insert policy for authenticated users
