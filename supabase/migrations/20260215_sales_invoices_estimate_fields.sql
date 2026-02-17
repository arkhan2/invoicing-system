-- Align sales_invoices with estimates: notes, project, subject, payment/delivery, discount, sales tax
alter table public.sales_invoices
  add column if not exists notes text,
  add column if not exists project_name text,
  add column if not exists subject text,
  add column if not exists payment_terms text,
  add column if not exists delivery_time_amount int,
  add column if not exists delivery_time_unit text,
  add column if not exists discount_amount decimal(12,2) default 0,
  add column if not exists discount_type text,
  add column if not exists sales_tax_rate_id uuid references public.company_sales_tax_rates(id) on delete set null;

create index if not exists idx_sales_invoices_sales_tax_rate_id on public.sales_invoices(sales_tax_rate_id);
