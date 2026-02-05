-- Add editable item_number to estimate and invoice line items.
-- Serial number (#) remains auto-generated (row index); item_number is user-editable.

alter table if exists public.estimate_items
  add column if not exists item_number text default '';

alter table if exists public.sales_invoice_items
  add column if not exists item_number text default '';
