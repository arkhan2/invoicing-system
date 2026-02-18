-- Invoice payment terms preset and due date
alter table public.sales_invoices
  add column if not exists terms_type text,
  add column if not exists due_date date;

comment on column public.sales_invoices.terms_type is 'Preset: due_on_receipt, net_15, net_30, eom, or custom';
comment on column public.sales_invoices.due_date is 'Payment due date; set from terms or custom';
