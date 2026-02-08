-- Payment terms and delivery time for estimates

alter table public.estimates
  add column if not exists payment_terms text,
  add column if not exists delivery_time_amount int,
  add column if not exists delivery_time_unit text check (delivery_time_unit is null or delivery_time_unit in ('days', 'weeks', 'months'));
