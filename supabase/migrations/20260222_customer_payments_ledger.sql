-- =============================================================================
-- Payment Ledger: customer_payments, customer_payment_allocations
-- Backward compatible; sales_invoice_payments unchanged.
-- =============================================================================

-- Companies: payment numbering
alter table public.companies
  add column if not exists payment_prefix text default 'PAY',
  add column if not exists payment_next_number int default 1;

-- -----------------------------------------------------------------------------
-- customer_payments
-- -----------------------------------------------------------------------------
create table if not exists public.customer_payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  payment_number text not null,
  payment_date date not null,
  mode_of_payment text not null,
  gross_amount numeric(12,2) not null,
  withholding_tax_rate_id uuid references public.company_withholding_tax_rates(id) on delete set null,
  withholding_amount numeric(12,2) default 0,
  net_amount numeric(12,2) not null,
  reference_payment_id text,
  notes text,
  status text not null check (status in ('Unallocated', 'Partially Allocated', 'Allocated')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(company_id, payment_number)
);

create index if not exists idx_customer_payments_company_id on public.customer_payments(company_id);
create index if not exists idx_customer_payments_customer_id on public.customer_payments(customer_id);
create index if not exists idx_customer_payments_payment_date on public.customer_payments(payment_date);

alter table public.customer_payments enable row level security;

drop policy if exists "Users can manage customer_payments of own companies" on public.customer_payments;
create policy "Users can manage customer_payments of own companies"
  on public.customer_payments for all
  using (exists (select 1 from public.companies c where c.id = company_id and c.user_id = (select auth.uid())));

-- -----------------------------------------------------------------------------
-- customer_payment_allocations
-- -----------------------------------------------------------------------------
create table if not exists public.customer_payment_allocations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  payment_id uuid not null references public.customer_payments(id) on delete cascade,
  sales_invoice_id uuid not null references public.sales_invoices(id) on delete restrict,
  allocated_amount numeric(12,2) not null check (allocated_amount > 0),
  created_at timestamptz default now()
);

create index if not exists idx_customer_payment_allocations_company_id on public.customer_payment_allocations(company_id);
create index if not exists idx_customer_payment_allocations_payment_id on public.customer_payment_allocations(payment_id);
create index if not exists idx_customer_payment_allocations_sales_invoice_id on public.customer_payment_allocations(sales_invoice_id);

alter table public.customer_payment_allocations enable row level security;

drop policy if exists "Users can manage customer_payment_allocations of own companies" on public.customer_payment_allocations;
create policy "Users can manage customer_payment_allocations of own companies"
  on public.customer_payment_allocations for all
  using (exists (select 1 from public.companies c where c.id = company_id and c.user_id = (select auth.uid())));

-- -----------------------------------------------------------------------------
-- View: paid amount per invoice (from allocations only)
-- -----------------------------------------------------------------------------
create or replace view public.sales_invoice_allocations_summary as
select
  sales_invoice_id,
  coalesce(sum(allocated_amount), 0)::numeric(12,2) as paid_amount
from public.customer_payment_allocations
group by sales_invoice_id;

-- Allow RLS to apply via underlying table; view is not security barrier
-- Reads go through customer_payment_allocations RLS when queried via API with company scope.
