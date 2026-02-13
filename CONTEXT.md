# Project context – chat summary & implementation notes

Use this file when opening a new chat in the **invoicing-system** workspace so the AI has full context.

---

## 1. Product overview

- **Sales & purchase invoicing** with optional **FBR (Pakistan Federal Board of Revenue) Digital Invoicing** integration.
- **Users** sign in, create **one company** (per user), then manage **customers** (for sales), **items**, **tax**, and **invoices**.
- **Sales invoices** can be submitted to FBR via a **separate middleware** (Phase 6). **Purchase invoices** are **not** sent to FBR.
- **Payments** on both sales and purchase invoices: amount, **deducted tax** (yes/no + amount), **mode of payment**, **reference payment ID**, date, notes.

---

## 2. Architecture decisions

| Layer | Choice | Reason |
|-------|--------|--------|
| **Database** | **Supabase (PostgreSQL)** | Auth, RLS, one place for app + optional middleware audit log. |
| **Main app** | **Next.js 14 (App Router)** on **Vercel** | SSR, API routes, good Supabase fit. |
| **FBR integration** | **Separate middleware** (own Vercel project) | Keeps FBR token and logic out of main app; single place for validate/post, idempotency, retries. |
| **Auth** | **Supabase Auth** (Email/Password) | `auth.users`; `companies.user_id` → `auth.users(id)`. |

Flow: **App** → (HTTPS + API key) → **Middleware** → (Bearer token) → **FBR DI API**. FBR credentials never live in the main app.

---

## 3. Data model (Supabase)

- **companies** – one per user; `user_id` → `auth.users(id)`; holds seller details for FBR, invoice number prefixes/sequences.
- **customers** – per company; buyer for sales invoices (NTN/CNIC, province, registration type, etc.).
- **tax_rates** – per company (e.g. 0%, 5%, 18%); one can be default.
- **uom** – system-wide (KG, Nos, Ltr, etc.); seeded in schema.
- **items** – per company; name, description, reference, HS code, unit_rate (pre-fills line item price), default tax, UOM, sale type.
- **sales_invoices** – company + customer; status Draft/Final/Sent; optional `fbr_irn`, `fbr_status`, `fbr_sent_at`.
- **sales_invoice_items** – line items (FBR-shaped: hs_code, rate_label, uom, value_sales_excluding_st, sales_tax_applicable, etc.).
- **sales_invoice_payments** – amount, deducted_tax, deducted_tax_amount, mode_of_payment, reference_payment_id, payment_date.
- **purchase_invoices** – company; no FBR.
- **purchase_invoice_items** – line items (simpler: quantity, unit_price, tax_amount, total_amount).
- **purchase_invoice_payments** – same payment fields as sales.
- **fbr_submission_log** – optional audit table for middleware (company_id, sales_invoice_id, action, request/response, status_code).

RLS: all company-scoped tables are restricted so `auth.uid()` only sees rows for their company (via `companies.user_id`).

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
| **2** | Pending | Company CRUD + onboarding (create company if none); Customers, Tax rates, Items CRUD. |
| **3** | Pending | Sales invoices: create/edit, line items, totals, payments; finalize; list/detail. |
| **4** | Pending | Purchase invoices: same flow; payments. |
| **5** | Pending | Polish, navigation, dashboard content. |
| **6** | Pending | FBR middleware project; “Submit to FBR” in app for finalized sales invoices. |

---

## 7. Tech stack (current)

- **Next.js 14** (App Router), **TypeScript**, **Tailwind CSS**.
- **Supabase:** `@supabase/supabase-js`, `@supabase/ssr` (client, server, middleware).
- **Key paths:** `src/app/` (routes), `src/lib/supabase/` (createClient), `src/middleware.ts`, `supabase/schema.sql`.

---

## 8. Env vars

- **App (`.env.local`):** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Optional later: `SUPABASE_SERVICE_ROLE_KEY`, `FBR_MIDDLEWARE_URL`, `FBR_MIDDLEWARE_API_KEY`.
- **Middleware (Phase 6):** `FBR_BEARER_TOKEN`, `FBR_BASE_URL`, `MIDDLEWARE_API_KEY`, optionally `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` for `fbr_submission_log`.

---

## 9. Workspace

- This project is opened as a **single-folder workspace** via `invoicing-system.code-workspace` so only the invoicing-system tree is visible in the sidebar.
- Other projects under `/Users/ar/development/` are **not** part of this workspace and were **not** deleted.

---

## 10. Quick reference for next chat

- **Goal:** Continue from **Phase 2** (Company CRUD, then Customers, Tax rates, Items).
- **DB:** All tables and RLS are in `supabase/schema.sql`; already run in Supabase.
- **Auth:** Supabase Auth; `createClient()` from `@/lib/supabase/client` (browser) or `@/lib/supabase/server` (RSC/API). Dashboard routes are protected in `(dashboard)/layout.tsx` via `getUser()` and redirect to `/login` if not authenticated.
- **Company:** One company per user; dashboard home prompts “Create company” if none exists and links to `/dashboard/company`.
