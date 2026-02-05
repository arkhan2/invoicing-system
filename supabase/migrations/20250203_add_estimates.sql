-- =============================================================================
-- Quotations / Estimates (Zoho-style): create estimate, convert to invoice
-- =============================================================================

-- Company: estimate numbering
alter table if exists public.companies
  add column if not exists estimate_prefix text default 'EST',
  add column if not exists estimate_next_number int default 1;

-- Estimates table
create table if not exists public.estimates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  estimate_number text not null,
  estimate_date date not null,
  status text default 'Draft' check (status in ('Draft', 'Sent', 'Accepted', 'Declined', 'Expired', 'Converted')),
  valid_until date,
  total_amount decimal(12,2) default 0,
  total_tax decimal(12,2) default 0,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(company_id, estimate_number)
);

create table if not exists public.estimate_items (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid not null references public.estimates(id) on delete cascade,
  item_id uuid references public.items(id) on delete set null,
  product_description text not null,
  hs_code text not null default '',
  rate_label text not null default '',
  uom text not null default 'Nos',
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
  sort_order int default 0,
  created_at timestamptz default now()
);

-- Sales invoice: link when created from estimate
alter table if exists public.sales_invoices
  add column if not exists estimate_id uuid references public.estimates(id) on delete set null;

create index if not exists idx_estimates_company_id on public.estimates(company_id);
create index if not exists idx_estimates_customer_id on public.estimates(customer_id);
create index if not exists idx_estimates_status on public.estimates(status);
create index if not exists idx_estimate_items_estimate_id on public.estimate_items(estimate_id);
create index if not exists idx_sales_invoices_estimate_id on public.sales_invoices(estimate_id);

alter table public.estimates enable row level security;
alter table public.estimate_items enable row level security;

drop policy if exists "Users can manage estimates of own companies" on public.estimates;
drop policy if exists "Users can manage estimate_items of own companies" on public.estimate_items;

create policy "Users can manage estimates of own companies"
  on public.estimates for all
  using (exists (select 1 from public.companies c where c.id = company_id and c.user_id = auth.uid()));

create policy "Users can manage estimate_items of own companies"
  on public.estimate_items for all
  using (exists (select 1 from public.estimates e join public.companies c on c.id = e.company_id where e.id = estimate_id and c.user_id = auth.uid()));
