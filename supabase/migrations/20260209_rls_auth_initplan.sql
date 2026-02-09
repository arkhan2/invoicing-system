-- RLS: use (select auth.uid()) so the value is evaluated once per query (initplan)
-- instead of per row. Fixes Supabase linter: auth_rls_initplan.

-- companies
drop policy if exists "Users can manage own companies" on public.companies;
create policy "Users can manage own companies"
  on public.companies for all
  using ((select auth.uid()) = user_id);

-- customers
drop policy if exists "Users can manage customers of own companies" on public.customers;
create policy "Users can manage customers of own companies"
  on public.customers for all
  using (exists (select 1 from public.companies c where c.id = company_id and c.user_id = (select auth.uid())));

-- vendors
drop policy if exists "Users can manage vendors of own companies" on public.vendors;
create policy "Users can manage vendors of own companies"
  on public.vendors for all
  using (exists (select 1 from public.companies c where c.id = company_id and c.user_id = (select auth.uid())));

-- tax_rates
drop policy if exists "Users can manage tax_rates of own companies" on public.tax_rates;
create policy "Users can manage tax_rates of own companies"
  on public.tax_rates for all
  using (exists (select 1 from public.companies c where c.id = company_id and c.user_id = (select auth.uid())));

-- items
drop policy if exists "Users can manage items of own companies" on public.items;
create policy "Users can manage items of own companies"
  on public.items for all
  using (exists (select 1 from public.companies c where c.id = company_id and c.user_id = (select auth.uid())));

-- estimates
drop policy if exists "Users can manage estimates of own companies" on public.estimates;
create policy "Users can manage estimates of own companies"
  on public.estimates for all
  using (exists (select 1 from public.companies c where c.id = company_id and c.user_id = (select auth.uid())));

-- estimate_items
drop policy if exists "Users can manage estimate_items of own companies" on public.estimate_items;
create policy "Users can manage estimate_items of own companies"
  on public.estimate_items for all
  using (exists (select 1 from public.estimates e join public.companies c on c.id = e.company_id where e.id = estimate_id and c.user_id = (select auth.uid())));

-- sales_invoices
drop policy if exists "Users can manage sales_invoices of own companies" on public.sales_invoices;
create policy "Users can manage sales_invoices of own companies"
  on public.sales_invoices for all
  using (exists (select 1 from public.companies c where c.id = company_id and c.user_id = (select auth.uid())));

-- sales_invoice_items
drop policy if exists "Users can manage sales_invoice_items of own companies" on public.sales_invoice_items;
create policy "Users can manage sales_invoice_items of own companies"
  on public.sales_invoice_items for all
  using (exists (select 1 from public.sales_invoices si join public.companies c on c.id = si.company_id where si.id = sales_invoice_id and c.user_id = (select auth.uid())));

-- sales_invoice_payments
drop policy if exists "Users can manage sales_invoice_payments of own companies" on public.sales_invoice_payments;
create policy "Users can manage sales_invoice_payments of own companies"
  on public.sales_invoice_payments for all
  using (exists (select 1 from public.sales_invoices si join public.companies c on c.id = si.company_id where si.id = sales_invoice_id and c.user_id = (select auth.uid())));

-- purchase_invoices
drop policy if exists "Users can manage purchase_invoices of own companies" on public.purchase_invoices;
create policy "Users can manage purchase_invoices of own companies"
  on public.purchase_invoices for all
  using (exists (select 1 from public.companies c where c.id = company_id and c.user_id = (select auth.uid())));

-- purchase_invoice_items
drop policy if exists "Users can manage purchase_invoice_items of own companies" on public.purchase_invoice_items;
create policy "Users can manage purchase_invoice_items of own companies"
  on public.purchase_invoice_items for all
  using (exists (select 1 from public.purchase_invoices pi join public.companies c on c.id = pi.company_id where pi.id = purchase_invoice_id and c.user_id = (select auth.uid())));

-- purchase_invoice_payments
drop policy if exists "Users can manage purchase_invoice_payments of own companies" on public.purchase_invoice_payments;
create policy "Users can manage purchase_invoice_payments of own companies"
  on public.purchase_invoice_payments for all
  using (exists (select 1 from public.purchase_invoices pi join public.companies c on c.id = pi.company_id where pi.id = purchase_invoice_id and c.user_id = (select auth.uid())));

-- fbr_submission_log
drop policy if exists "Users can read own company fbr log" on public.fbr_submission_log;
create policy "Users can read own company fbr log"
  on public.fbr_submission_log for select
  using (exists (select 1 from public.companies c where c.id = company_id and c.user_id = (select auth.uid())));

-- company_sales_tax_rates
drop policy if exists "Users can manage company_sales_tax_rates of own company" on public.company_sales_tax_rates;
create policy "Users can manage company_sales_tax_rates of own company"
  on public.company_sales_tax_rates for all
  using (exists (select 1 from public.companies c where c.id = company_id and c.user_id = (select auth.uid())));

-- company_withholding_tax_rates
drop policy if exists "Users can manage company_withholding_tax_rates of own company" on public.company_withholding_tax_rates;
create policy "Users can manage company_withholding_tax_rates of own company"
  on public.company_withholding_tax_rates for all
  using (exists (select 1 from public.companies c where c.id = company_id and c.user_id = (select auth.uid())));
