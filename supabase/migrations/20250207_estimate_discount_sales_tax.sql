-- Estimate-level discount and sales tax (from company profile)

alter table public.estimates
  add column if not exists discount_amount decimal(12,2) default 0,
  add column if not exists discount_type text default 'amount' check (discount_type in ('amount', 'percentage')),
  add column if not exists sales_tax_rate_id uuid references public.company_sales_tax_rates(id) on delete set null;

create index if not exists idx_estimates_sales_tax_rate_id on public.estimates(sales_tax_rate_id);
