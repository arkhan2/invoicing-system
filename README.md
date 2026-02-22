# Invoicing System (Sales & Purchase + FBR)

Next.js app for sales and purchase invoicing with optional FBR (Pakistan Federal Board of Revenue) Digital Invoicing. One company per user; manage customers, vendors, items, estimates, and sales invoices. Estimates can be converted to sales invoices; both have document views and PDF export.

## Folder structure

```
invoicing-system/
├── README.md
├── CONTEXT.md                 # Project context for AI / onboarding
├── .env.local.example         # Copy to .env.local and fill in Supabase keys
├── next.config.js
├── tailwind.config.ts
├── supabase/
│   ├── schema.sql             # Legacy full schema reference
│   └── migrations/            # Applied migrations (run in order)
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx            # Redirects to /dashboard or /login
│   │   ├── globals.css
│   │   ├── (auth)/             # login, signup, forgot-password, auth/callback
│   │   ├── (dashboard)/        # Protected dashboard
│   │   │   ├── layout.tsx      # Sidebar nav + main
│   │   │   ├── page.tsx        # Dashboard home
│   │   │   ├── company/       # Company profile CRUD
│   │   │   ├── customers/     # List, new, [id], [id]/edit, import
│   │   │   ├── vendors/       # List, new, [id], [id]/edit, import
│   │   │   ├── items/         # List, new, [id], [id]/edit, import
│   │   │   ├── estimates/     # List, new, [id], [id]/edit, import
│   │   │   └── sales/         # Invoices: list, new, [id], [id]/edit, import
│   │   └── api/
│   ├── components/            # ConfirmDialog, Modal, LineItemsEditor, etc.
│   └── lib/
│       └── supabase/          # client.ts, server.ts
├── docs/
│   ├── VISUAL-DESIGN-AND-COLORS.md   # Semantic colors, themes, calculation table
│   ├── UI-DESIGN.md                  # Layout and UI patterns
│   ├── UI-RESPONSIVE-BLUEPRINT.md
│   ├── DESIGN_SYSTEM.md
│   ├── estimate-first-page-content-calculation.md
│   └── PRAL_DI_API_Technical_Specification.md   # FBR DI API reference
```

## Documentation

- **[FEATURES.md](FEATURES.md)** — Implemented features, app structure, and full database schema reference.
- **[CONTEXT.md](CONTEXT.md)** — Project context, phases, data model, quick reference (for AI and developers).
- **[docs/VISUAL-DESIGN-AND-COLORS.md](docs/VISUAL-DESIGN-AND-COLORS.md)** — Semantic color system, light/dark themes, calculation table and G.Total styling.
- **[docs/UI-DESIGN.md](docs/UI-DESIGN.md)** — UI and layout patterns.
- **[docs/PRAL_DI_API_Technical_Specification.md](docs/PRAL_DI_API_Technical_Specification.md)** — PRAL/FBR Digital Invoicing API reference (endpoints, payloads, error codes). Sourced from PRAL Technical Specification for DI API v1.12.

## Setup

1. **Supabase**
   - Create a project at [supabase.com](https://supabase.com/dashboard).
   - Run migrations from `supabase/migrations/` in order in the SQL Editor (or use Supabase CLI). Alternatively run `supabase/schema.sql` if it is kept in sync.
   - In **Authentication → Providers**, enable Email (and optionally Google). Configure redirect URLs for auth/callback, reset-password, etc.
   - In **Project Settings → API**, copy **Project URL** and **anon** key.

2. **App**
   - `cp .env.local.example .env.local` and set:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `npm install`
   - `npm run dev`

3. Open [http://localhost:3000](http://localhost:3000). Sign up, then create your company. You can then manage customers, items, estimates, and sales invoices.

## Phases

- **Phase 1** — Done: DB schema, auth, dashboard shell, placeholder pages.
- **Phase 2** — Done: Company, customers, vendors, tax rates, items (CRUD + CSV import).
- **Phase 3** — Done: Estimates (create/edit, document view, PDF export, send, convert to invoice); Sales invoices (create/edit, document view, PDF export, link from estimate; customer search).
- **Phase 4** — Pending: Purchase invoices + payments.
- **Phase 5** — Done (ongoing): Polish, responsive layout, design system.
- **Phase 6** — Pending: FBR middleware and “Submit to FBR” for sales invoices.
