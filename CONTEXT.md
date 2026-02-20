# Project context – chat summary & implementation notes

Use this file when opening a new chat in the **invoicing-system** workspace so the AI has full context.

---

## 1. Product overview

- **Sales & purchase invoicing** with optional **FBR (Pakistan Federal Board of Revenue) Digital Invoicing** integration.
- **Users** sign in, create **one company** (per user), then manage **customers**, **vendors**, **items**, **tax**, **estimates**, and **sales invoices**.
- **Estimates** – create/send/expire; convert to **sales invoice**; document view with PDF export; status Draft/Sent/Expired/Converted. Linked invoice shown as “To invoice #…” badge (clickable).
- **Sales invoices** – create/edit; optional link to estimate (`estimate_id`); document view with PDF export; “From estimate #…” badge when from estimate (clickable). Terms/due date; no delivery-time field. Customer search (same as estimate), add/edit customer modal.
- **Purchase invoices** – not yet implemented.
- **Sales invoices** can be submitted to FBR via a **separate middleware** (Phase 6). **Purchase invoices** are **not** sent to FBR.
- **Payments** on both sales and purchase invoices: amount, deducted tax, mode of payment, reference payment ID, date, notes (Phase 3/4).

---

## 2. Architecture decisions

| Layer | Choice | Reason |
|-------|--------|--------|
| **Database** | **Supabase (PostgreSQL)** | Auth, RLS, one place for app + optional middleware audit log. |
| **Main app** | **Next.js 16 (App Router)** on **Vercel** | SSR, API routes, good Supabase fit. |
| **FBR integration** | **Separate middleware** (own Vercel project) | Keeps FBR token and logic out of main app; single place for validate/post, idempotency, retries. |
| **Auth** | **Supabase Auth** (Email/Password) | `auth.users`; `companies.user_id` → `auth.users(id)`. |

Flow: **App** → (HTTPS + API key) → **Middleware** → (Bearer token) → **FBR DI API**. FBR credentials never live in the main app.

---

## 3. Data model (Supabase)

- **companies** – one per user; `user_id` → `auth.users(id)`; seller details, logo, invoice/estimate prefixes, tax rates config.
- **customers** – per company; buyer for sales/estimates (NTN/CNIC, address, contact, etc.); CSV import.
- **vendors** – per company; structure mirrors customers; CSV import.
- **company_sales_tax_rates** – per company (name, rate %); used on estimates and sales invoices.
- **uom** – system-wide (KG, Nos, Ltr, etc.); seeded.
- **items** – per company; item_number, description, HS code, unit_rate, UOM, sale type; CSV import; catalog for line items.
- **estimates** – company + customer; estimate_number, date, status (Draft/Sent/Expired/Converted), valid_until, notes, project_name, subject, payment_terms, delivery_time, discount, sales_tax_rate_id, total_amount, total_tax.
- **estimate_items** – line items per estimate.
- **sales_invoices** – company + customer; optional **estimate_id** (converted from estimate); invoice_number, date, status (Draft/Final/Sent), terms_type, due_date, discount, sales_tax_rate_id, total_amount, total_tax; no delivery_time on invoice.
- **sales_invoice_items** – line items (FBR-shaped: hs_code, rate_label, uom, value_sales_excluding_st, etc.).
- **sales_invoice_payments** – amount, deducted_tax, mode_of_payment, reference_payment_id, payment_date (for future use).
- **purchase_invoices**, **purchase_invoice_items**, **purchase_invoice_payments** – not yet used.
- **fbr_submission_log** – optional audit table for middleware.

Schema is applied via **supabase/migrations/** (run in order); **supabase/schema.sql** is the legacy single-file reference. RLS: company-scoped tables restricted by `companies.user_id = auth.uid()`.

---

## 4. FBR DI API (reference)

- **Doc:** PRAL Technical Specification for DI API v1.12 (Pakistan Digital Invoicing).
- **Endpoints:** `postinvoicedata` (submit), `validateinvoicedata` (validate only). Sandbox vs production same URL pattern; routing by token.
- **Auth:** Bearer token in `Authorization` header (issued by PRAL, 5-year validity).
- **Payload:** JSON with seller (company), buyer (customer), `items[]` (HS code, rate, UOM, valueSalesExcludingST, salesTaxApplicable, etc.). Sandbox requires `scenarioId` (e.g. SN001).

---

## 5. Middleware (Phase 6) – not built yet

- **Separate repo/project** (e.g. `fbr-middleware`) on Vercel.
- **Env:** `FBR_BEARER_TOKEN`, `FBR_BASE_URL`, `MIDDLEWARE_API_KEY`.
- **Contract:** App sends `POST /api/submit` with header `Authorization: Bearer <FBR_MIDDLEWARE_API_KEY>`, body `{ idempotency_key, payload }` (payload = FBR DI JSON). Middleware validates with FBR, then posts; returns `invoiceNumber`, `status`, etc. App then updates `sales_invoices.fbr_irn`, `fbr_status`, `fbr_sent_at`.
- **App env (Phase 6):** `FBR_MIDDLEWARE_URL`, `FBR_MIDDLEWARE_API_KEY` (server-side only).

---

## 6. Implementation phases

| Phase | Status | Description |
|-------|--------|-------------|
| **1** | **Done** | DB schema in Supabase; Next.js app with auth (login/signup); dashboard layout and placeholder pages (Company, Customers, Items, Sales, Purchases); Supabase client/server + middleware for cookies. |
| **2** | **Done** | Company CRUD + onboarding; Customers, Vendors, Tax rates (company_sales_tax_rates), Items CRUD; CSV import for customers, vendors, items, estimates. |
| **3** | **Done** | **Estimates:** create/edit, line items, discount, sales tax, document view, PDF export, send, convert to invoice, status badges; list/detail/edit. **Sales invoices:** create/edit, line items, discount, sales tax, terms/due date, document view, PDF export, link from estimate; customer search (like estimate); list/detail/edit. Estimate ↔ invoice badges (clickable) on document views. |
| **4** | Pending | Purchase invoices: same flow; payments. |
| **5** | **Done** (ongoing) | Polish: responsive layout, list/detail/sidebar patterns, design system (VISUAL-DESIGN-AND-COLORS.md, UI-DESIGN.md), calculation table colors, G.Total styling. |
| **6** | Pending | FBR middleware project; “Submit to FBR” in app for finalized sales invoices. |

---

## 7. Tech stack (current)

- **Next.js 16** (App Router), **TypeScript**, **Tailwind CSS**.
- **Supabase:** `@supabase/supabase-js`, `@supabase/ssr` (client, server, middleware).
- **UI:** Radix (dialog, dropdown, popover, select), Lucide icons, html2canvas + jspdf for PDF export.
- **Key paths:** `src/app/(dashboard)/dashboard/` (company, customers, vendors, items, estimates, sales), `src/lib/supabase/`, `src/components/`, `supabase/migrations/`, `docs/` (VISUAL-DESIGN-AND-COLORS.md, UI-DESIGN.md, PRAL spec).

---

## 8. Env vars

- **App (`.env.local`):** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Optional: `SUPABASE_SERVICE_ROLE_KEY`, `FBR_MIDDLEWARE_URL`, `FBR_MIDDLEWARE_API_KEY` (Phase 6).
- **Middleware (Phase 6):** `FBR_BEARER_TOKEN`, `FBR_BASE_URL`, `MIDDLEWARE_API_KEY`, optionally `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` for `fbr_submission_log`.

---

## 9. Workspace

- This project is opened as a **single-folder workspace** via `invoicing-system.code-workspace` so only the invoicing-system tree is visible in the sidebar.
- Other projects under `/Users/ar/development/` are **not** part of this workspace and were **not** deleted.

---

## 10. Quick reference for next chat

- **Done:** Company, customers, vendors, items (CRUD + import); estimates (full flow + PDF + convert); sales invoices (full flow + PDF + estimate link + customer search). Document view badges link estimate ↔ invoice.
- **Next:** Phase 4 (purchase invoices) or Phase 6 (FBR middleware + submit to FBR).
- **DB:** Schema applied via `supabase/migrations/`; `supabase/schema.sql` is legacy reference. RLS on all company-scoped tables.
- **Auth:** Supabase Auth; `createClient()` from `@/lib/supabase/client` (browser) or `@/lib/supabase/server` (RSC/API). Dashboard protected in `(dashboard)/layout.tsx`; redirect to `/login` if not authenticated.
- **Design:** Semantic colors in `src/app/globals.css`; components use `var(--color-*)`. See `docs/VISUAL-DESIGN-AND-COLORS.md` and `docs/UI-DESIGN.md`.
