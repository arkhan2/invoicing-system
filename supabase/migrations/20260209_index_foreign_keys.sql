-- Add indexes on foreign key columns (Supabase linter: unindexed_foreign_keys)
-- Improves JOIN and CASCADE delete performance.

-- estimate_items.item_id
create index if not exists idx_estimate_items_item_id on public.estimate_items(item_id);

-- fbr_submission_log
create index if not exists idx_fbr_submission_log_company_id on public.fbr_submission_log(company_id);
create index if not exists idx_fbr_submission_log_sales_invoice_id on public.fbr_submission_log(sales_invoice_id);

-- items (optional FKs)
create index if not exists idx_items_default_tax_rate_id on public.items(default_tax_rate_id);
create index if not exists idx_items_uom_id on public.items(uom_id);

-- purchase_invoice_items.item_id
create index if not exists idx_purchase_invoice_items_item_id on public.purchase_invoice_items(item_id);

-- sales_invoice_items.item_id
create index if not exists idx_sales_invoice_items_item_id on public.sales_invoice_items(item_id);
