-- Add default unit rate to items (pre-fills unit_price when item is used in line items)
alter table public.items
  add column if not exists unit_rate decimal(12,4) default null;
