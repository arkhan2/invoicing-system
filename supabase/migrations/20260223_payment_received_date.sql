-- Add payment received date (can differ from payment date, e.g. cheque date vs clearance date)
alter table public.customer_payments
  add column if not exists payment_received_date date;

comment on column public.customer_payments.payment_received_date is 'Date the payment was actually received; may differ from payment_date (e.g. cheque date).';
