# Invoicing System – Features & Project Reference

Detailed list of what is implemented, project structure, and database schema. For setup and phases overview see [README.md](README.md); for AI/developer context see [CONTEXT.md](CONTEXT.md).

---

## 1. Product overview

- **Sales & purchase invoicing** with optional **FBR (Pakistan Federal Board of Revenue) Digital Invoicing**.
- **One company per user.** Users manage **customers**, **vendors**, **items**, **tax rates**, **estimates**, and **sales invoices**.
- **Estimates** can be sent, expired, or **converted to a sales invoice**. Document view and PDF export for both.
- **Sales invoices** can be created from scratch or from an estimate; terms/due date; document view and PDF; customer search.
- **Purchase invoices** and **FBR submit** are planned (not yet implemented).

---

## 2. Tech stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 16 (App Router), TypeScript |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth (Email/Password) |
| **Styling** | Tailwind CSS, semantic CSS variables (`globals.css`) |
| **UI** | Radix (Dialog, Dropdown, Popover, Select), Lucide icons |
| **PDF export** | html2canvas + jspdf |
| **Deploy** | Vercel (intended) |

---

## 3. Implemented features

### 3.1 Authentication

- **Login** – Email/password via Supabase Auth.
- **Sign up** – New user registration.
- **Forgot password** – Reset flow; redirect URLs for auth/callback and reset-password.
- **Session** – Cookie-based; Supabase client/server and middleware for SSR.
- **Protected dashboard** – `(dashboard)/layout.tsx` redirects unauthenticated users to `/login`.

### 3.2 Company (one per user)

- **Create company** – Onboarding after signup; one company per user (`companies.user_id` → `auth.users(id)`).
- **Company profile CRUD** – Name, NTN, CNIC, address, city, province, GST number, registration type, phone, email.
- **Numbering** – Configurable prefixes and next numbers for sales invoices (`sales_invoice_prefix`, `sales_invoice_next_number`), estimates (`estimate_prefix`, `estimate_next_number`), and purchase invoices (prefix/next stored, not yet used in UI).
- **Logo** – `logo_url` for document/PDF header.
- **Tax rates** – Company-level sales tax rates (`company_sales_tax_rates`); name and rate %; used on estimates and sales invoices.

### 3.3 Customers

- **CRUD** – List, new, view/edit by id, delete.
- **Fields** – Name, contact person, NTN/CNIC, address, city, province, country, registration type, phone, email.
- **CSV import** – Bulk import with column mapping.

### 3.4 Vendors

- **CRUD** – List, new, view/edit by id, delete.
- **Fields** – Same structure as customers (name, contact person, NTN/CNIC, address, city, province, country, registration type, phone, email).
- **CSV import** – Bulk import with column mapping.

### 3.5 Items (product catalog)

- **CRUD** – List, new, view/edit by id, delete.
- **Fields** – Name, description, reference, HS code, unit rate, UOM (from `uom` table), sale type (e.g. “Goods at standard rate”).
- **CSV import** – Bulk import with column mapping.
- **Usage** – Items are used as catalog for line items on estimates and sales invoices; line items store snapshot (description, hs_code, rate_label, uom, unit_price, etc.) plus optional `item_id` link.

### 3.6 Units of measure (UOM)

- **System-wide** – Seeded table `uom`: KG, Nos, Ltr, Meter, Box, Packet, rft, sqft.
- **Read-only** in app – Used in item and line item forms.

### 3.7 Estimates (quotations)

- **Create / edit** – Customer, estimate number (auto from company prefix/next), date, valid until, project name, subject, payment terms, delivery time (amount + unit: days/weeks/months), notes.
- **Line items** – Product description, item number, HS code, rate label, UOM, quantity, unit price, value ex. ST, tax fields, discount, total; optional link to catalog item (`item_id`).
- **Discount** – Estimate-level discount (amount or percentage).
- **Sales tax** – Estimate-level `sales_tax_rate_id` → `company_sales_tax_rates`; totals computed (total_amount, total_tax).
- **Status** – Draft, Sent, Expired, Converted (and legacy Accepted/Declined in DB).
- **Document view** – Read-only document layout with company/customer/line items/totals; “To invoice #…” badge when converted (links to sales invoice).
- **PDF export** – Generate PDF from document view.
- **Send** – Mark as Sent (status update).
- **Convert to invoice** – Creates a new sales invoice from the estimate and links it (`estimate_id`); estimate status set to Converted.
- **List / detail** – List with filters; detail with sidebar (desktop) or drawer (mobile); stable sidebar (no reload on open).
- **CSV import** – Bulk import of estimates (with mapping).

### 3.8 Sales invoices

- **Create / edit** – Customer, invoice number (auto from company prefix/next), date, notes, project name, subject, payment terms; **terms type** (Due on receipt, Net 15, Net 30, Net 45, Net 60, EOM, Custom) and **due date**; optional link to estimate (`estimate_id`).
- **Line items** – Same FBR-shaped fields as estimates (item_number, product_description, hs_code, rate_label, uom, quantity, unit_price, value_sales_excluding_st, tax fields, discount, total_values, sale_type); optional `item_id` link to catalog.
- **Discount** – Invoice-level discount (amount or percentage).
- **Sales tax** – Invoice-level `sales_tax_rate_id` → `company_sales_tax_rates`; totals computed.
- **Status** – Draft, Final, Sent.
- **Document view** – Read-only document with “From estimate #…” badge when created from estimate (clickable link to estimate).
- **PDF export** – Generate PDF from document view.
- **Customer search** – Search customers by name/email when selecting customer; add/edit customer from modal.
- **Clone invoice** – Duplicate an existing invoice (new draft) from sidebar action.
- **List / detail** – List with filters; detail with sidebar (desktop) or drawer (mobile); stable sidebar (no reload on open).
- **CSV import** – Bulk import of sales invoices (with mapping).
- **Payments table** – `sales_invoice_payments` exists (amount, deducted_tax, mode_of_payment, reference_payment_id, payment_date, notes); UI for payments not yet implemented.

### 3.9 UI and layout

- **Dashboard** – Sidebar nav (Company, Customers, Vendors, Items, Estimates, Sales, Purchases placeholder); main content area.
- **Responsive** – Desktop: persistent sidebar for lists (invoices/estimates); mobile: drawer for list, same content; sections use consistent negative margins (`-m-4 lg:-m-6`).
- **Document view** – Same layout on mobile (zoom/scroll only, no reflow); fixed layout and overflow-x-auto.
- **Top bar** – Circular icon and button sizes consistent on mobile; icons/buttons centered where applicable (dashboard-top-bar, content-center in `globals.css`).
- **Design system** – Semantic colors (`var(--color-*)`), themes (light/dark), calculation table and G.Total styling; see `docs/VISUAL-DESIGN-AND-COLORS.md`, `docs/UI-DESIGN.md`, `docs/DESIGN_SYSTEM.md`, `docs/UI-RESPONSIVE-BLUEPRINT.md`.

---

## 4. Not yet implemented

- **Purchase invoices** – Tables and RLS exist; no app UI or flows (Phase 4).
- **Payments UI** – Sales (and purchase) invoice payment tables exist; no forms or list UI yet.
- **FBR submission** – Separate middleware and “Submit to FBR” for finalized sales invoices (Phase 6); `fbr_irn`, `fbr_status`, `fbr_sent_at` and `fbr_submission_log` are in schema for future use.

---

## 5. Application structure (key paths)

```
src/
├── app/
│   ├── layout.tsx, page.tsx, globals.css
│   ├── (auth)/                    # login, signup, forgot-password, auth/callback
│   └── (dashboard)/
│       └── dashboard/
│           ├── layout.tsx         # Company loader, layout shell
│           ├── page.tsx           # Dashboard home
│           ├── company/           # Company profile CRUD
│           ├── customers/         # List, new, [id], [id]/edit, import
│           ├── vendors/           # List, new, [id], [id]/edit, import
│           ├── items/             # List, new, [id], [id]/edit, import
│           ├── estimates/         # List, new, [id], [id]/edit; EstimateDocumentView, convert
│           └── sales/             # Invoices: list, new, [id], [id]/edit; InvoiceDocumentView, clone
├── components/                    # Drawer, ConfirmDialog, Modal, LineItemsEditor, etc.
└── lib/
    └── supabase/                  # client.ts, server.ts (createClient)
```

- **Routes** – `/`, `/login`, `/signup`, `/forgot-password`, `/dashboard`, `/dashboard/company`, `/dashboard/customers`, `/dashboard/vendors`, `/dashboard/items`, `/dashboard/estimates`, `/dashboard/sales`, plus nested `new`, `[id]`, `[id]/edit`, and `import` where applicable.
- **Server actions** – In `dashboard/*/actions.ts` (e.g. customers, vendors, items, estimates, sales); Supabase calls from server.

---

## 6. Database schema (Supabase / PostgreSQL)

Schema is applied via **supabase/migrations/** (run in order). **supabase/schema.sql** is a legacy single-file reference; some columns were added in migrations (see below). All company-scoped tables use **Row Level Security (RLS)** so rows are visible/editable only when `companies.user_id = auth.uid()`.

### 6.1 Core tables

**companies**

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| user_id | uuid | FK → auth.users(id), one company per user |
| name | text | Company name |
| ntn, cnic | text | Tax identifiers |
| address, city, province | text | Address |
| gst_number | text | GST |
| registration_type | text | 'Registered' / 'Unregistered' |
| phone, email | text | Contact |
| sales_invoice_prefix | text | e.g. 'INV' |
| sales_invoice_next_number | int | Next number for new invoices |
| estimate_prefix, estimate_next_number | text, int | For estimates |
| purchase_invoice_prefix, purchase_invoice_next_number | text, int | For future purchase invoices |
| logo_url | text | Company logo |
| created_at, updated_at | timestamptz | |

**customers**

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| company_id | uuid | FK → companies(id) |
| name | text | |
| contact_person_name | text | |
| ntn_cnic | text | |
| address, city, province, country | text | |
| registration_type | text | 'Registered' / 'Unregistered' |
| phone, email | text | |
| created_at, updated_at | timestamptz | |

**vendors** – Same structure as customers (company_id → companies).

### 6.2 Tax and UOM

**company_sales_tax_rates** (per company; used on estimates and sales invoices)

| Column | Type |
|--------|------|
| id | uuid PK |
| company_id | uuid FK → companies(id) |
| name | text |
| rate | decimal(5,2) |
| created_at | timestamptz |

**company_withholding_tax_rates** – Same shape; created in migrations, not yet used in app.

**uom** (system-wide, seeded)

| Column | Type |
|--------|------|
| id | uuid PK |
| code | text unique (e.g. KG, Nos, Ltr, Meter, Box, Packet, rft, sqft) |
| description | text |

**tax_rates** – In legacy schema; app uses company_sales_tax_rates for estimates/invoices. Items may reference tax_rates in some migrations.

### 6.3 Items

**items**

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| company_id | uuid | FK → companies(id) |
| name | text | |
| description | text | |
| reference | text | User-facing reference/code |
| hs_code | text | |
| unit_rate | decimal(12,4) | Default unit price |
| default_tax_rate_id | uuid | FK → tax_rates(id), optional |
| uom_id | uuid | FK → uom(id) |
| sale_type | text | e.g. 'Goods at standard rate (default)' |
| created_at, updated_at | timestamptz | |

### 6.4 Estimates

**estimates**

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| company_id | uuid | FK → companies(id) |
| customer_id | uuid | FK → customers(id) |
| estimate_number | text | Unique per company |
| estimate_date | date | |
| status | text | 'Draft' | 'Sent' | 'Accepted' | 'Declined' | 'Expired' | 'Converted' |
| valid_until | date | |
| total_amount, total_tax | decimal(12,2) | |
| notes | text | |
| project_name, subject | text | From migrations |
| payment_terms | text | |
| delivery_time_amount | int | |
| delivery_time_unit | text | 'days' | 'weeks' | 'months' |
| discount_amount | decimal(12,2) | |
| discount_type | text | 'amount' | 'percentage' |
| sales_tax_rate_id | uuid | FK → company_sales_tax_rates(id) |
| created_at, updated_at | timestamptz | |
| unique(company_id, estimate_number) | | |

**estimate_items**

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| estimate_id | uuid | FK → estimates(id) |
| item_id | uuid | FK → items(id), optional |
| item_number | text | User-editable (from migrations) |
| product_description | text | |
| hs_code, rate_label, uom | text | |
| quantity | decimal(12,4) | |
| unit_price | decimal(12,4) | |
| value_sales_excluding_st | decimal(12,2) | |
| sales_tax_applicable, sales_tax_withheld_at_source, extra_tax, further_tax | decimal(12,2) | |
| discount, total_values | decimal(12,2) | |
| sale_type | text | |
| sort_order | int | |
| created_at | timestamptz | |

### 6.5 Sales invoices

**sales_invoices**

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| company_id | uuid | FK → companies(id) |
| customer_id | uuid | FK → customers(id) |
| estimate_id | uuid | FK → estimates(id), optional (converted from estimate) |
| invoice_number | text | Unique per company |
| invoice_date | date | |
| invoice_type | text | 'Sale Invoice' | 'Debit Note' |
| invoice_ref_no | text | |
| status | text | 'Draft' | 'Final' | 'Sent' |
| fbr_irn, fbr_status, fbr_sent_at | text, text, timestamptz | For FBR (Phase 6) |
| total_amount, total_tax | decimal(12,2) | |
| notes, project_name, subject | text | From migrations |
| payment_terms | text | |
| delivery_time_amount, delivery_time_unit | int, text | From migrations |
| discount_amount, discount_type | decimal, text | |
| sales_tax_rate_id | uuid | FK → company_sales_tax_rates(id) |
| terms_type | text | e.g. 'due_on_receipt', 'net_15', 'net_30', 'net_45', 'net_60', 'eom', 'custom' |
| due_date | date | |
| created_at, updated_at | timestamptz | |
| unique(company_id, invoice_number) | | |

**sales_invoice_items** – Same shape as estimate_items (item_number, product_description, hs_code, rate_label, uom, quantity, unit_price, value_sales_excluding_st, tax fields, discount, total_values, sale_type, sro_schedule_no, sro_item_serial_no, sort_order); FK → sales_invoices(id) and optional item_id → items(id).

**sales_invoice_payments**

| Column | Type |
|--------|------|
| id | uuid PK |
| sales_invoice_id | uuid FK → sales_invoices(id) |
| amount | decimal(12,2) |
| deducted_tax | boolean |
| deducted_tax_amount | decimal(12,2) |
| mode_of_payment | text ('Cash', 'Bank Transfer', 'Cheque', 'Card', 'Online', 'Other') |
| reference_payment_id | text |
| payment_date | date |
| notes | text |
| created_at | timestamptz |

### 6.6 Purchase invoices (schema only, no app UI)

**purchase_invoices** – company_id, vendor_id, invoice_number, invoice_date, status ('Draft'|'Final'), total_amount, total_tax, timestamps; unique(company_id, invoice_number).

**purchase_invoice_items** – purchase_invoice_id, item_id, product_description, quantity, unit_price, tax_amount, total_amount, sort_order.

**purchase_invoice_payments** – Same shape as sales_invoice_payments (amount, deducted_tax, mode_of_payment, reference_payment_id, payment_date, notes).

### 6.7 FBR (Phase 6)

**fbr_submission_log** – id, company_id, sales_invoice_id, action, request_payload (jsonb), response_payload (jsonb), status_code, created_at. RLS: users can read own company’s log; middleware (service role) would insert.

### 6.8 Indexes and RLS

- Indexes on foreign keys and common filters (e.g. company_id, customer_id, estimate_id, invoice_date).
- RLS enabled on all tables above; policies restrict access by `companies.user_id = auth.uid()` (or via company through related entity). `uom` is read-only for authenticated users.

---

## 7. Environment variables

- **App (`.env.local`):** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Optional: `SUPABASE_SERVICE_ROLE_KEY`; Phase 6: `FBR_MIDDLEWARE_URL`, `FBR_MIDDLEWARE_API_KEY`.
- **FBR middleware (Phase 6):** `FBR_BEARER_TOKEN`, `FBR_BASE_URL`, `MIDDLEWARE_API_KEY`; optional Supabase for `fbr_submission_log`.

---

## 8. Documentation index

| Document | Purpose |
|----------|---------|
| [README.md](README.md) | Setup, folder structure, phases summary |
| [CONTEXT.md](CONTEXT.md) | Product overview, architecture, phases, quick reference for AI/devs |
| [FEATURES.md](FEATURES.md) | This file – implemented features, app structure, full DB reference |
| [docs/VISUAL-DESIGN-AND-COLORS.md](docs/VISUAL-DESIGN-AND-COLORS.md) | Semantic colors, themes, calculation table |
| [docs/UI-DESIGN.md](docs/UI-DESIGN.md) | Layout and UI patterns |
| [docs/UI-RESPONSIVE-BLUEPRINT.md](docs/UI-RESPONSIVE-BLUEPRINT.md) | Responsive behavior |
| [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | Design system |
| [docs/estimate-first-page-content-calculation.md](docs/estimate-first-page-content-calculation.md) | Estimate calculation behavior |
| [docs/PRAL_DI_API_Technical_Specification.md](docs/PRAL_DI_API_Technical_Specification.md) | FBR/PRAL Digital Invoicing API reference |
