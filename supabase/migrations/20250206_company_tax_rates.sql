-- Sales tax rates and withholding tax rates per company

create table if not exists public.company_sales_tax_rates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  rate decimal(5,2) not null check (rate >= 0 and rate <= 100),
  created_at timestamptz default now()
);

create table if not exists public.company_withholding_tax_rates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  rate decimal(5,2) not null check (rate >= 0 and rate <= 100),
  created_at timestamptz default now()
);

create index if not exists idx_company_sales_tax_rates_company_id on public.company_sales_tax_rates(company_id);
create index if not exists idx_company_withholding_tax_rates_company_id on public.company_withholding_tax_rates(company_id);

alter table public.company_sales_tax_rates enable row level security;
alter table public.company_withholding_tax_rates enable row level security;

drop policy if exists "Users can manage company_sales_tax_rates of own company" on public.company_sales_tax_rates;
drop policy if exists "Users can manage company_withholding_tax_rates of own company" on public.company_withholding_tax_rates;

create policy "Users can manage company_sales_tax_rates of own company"
  on public.company_sales_tax_rates for all
  using (exists (select 1 from public.companies c where c.id = company_id and c.user_id = auth.uid()));

create policy "Users can manage company_withholding_tax_rates of own company"
  on public.company_withholding_tax_rates for all
  using (exists (select 1 from public.companies c where c.id = company_id and c.user_id = auth.uid()));
