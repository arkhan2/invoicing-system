# Invoicing System — UI Design & Layout Reference

This document describes the UI implementation, design system, and **layout structure for each entity** in the app.

---

## 1. Technology stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router), React 18 |
| Styling | Tailwind CSS 3 + CSS custom properties |
| Headless / primitives | @radix-ui/react-dialog, @radix-ui/react-dropdown-menu, @radix-ui/react-popover, @radix-ui/react-select |
| Date picker | react-day-picker (v9), optional calendar in Radix Popover |
| Icons | lucide-react |
| Font | Roboto (next/font/google, variable `--font-roboto`) |
| Virtualization | @tanstack/react-virtual (long lists) |

**Hybrid approach:** Custom Tailwind + CSS design system with **Radix UI primitives** for complex behavior (modals, dropdowns, focus trap, keyboard, a11y). Buttons, inputs, and cards remain custom; Modal and ConfirmDialog are implemented with Radix Dialog; per-page dropdowns use Radix DropdownMenu; optional date calendar uses Radix Popover + react-day-picker.

---

## 2. Global shell (dashboard layout)

**Files:** `src/app/(dashboard)/layout.tsx` (server: auth, data, wrapper) and `src/app/(dashboard)/DashboardShell.tsx` (client: header, nav, main).

- **Structure:** Fixed header + left nav + main content. **Responsive:** at `lg` (1024px+) the nav is a fixed aside; below `lg` the nav is a **slide-over drawer** opened by a hamburger (Menu icon) in the header.
- **Header (fixed):** Hamburger (visible only below `lg`), logo/company name, user email, theme toggle. Height `var(--header-height)` (56px), border-bottom. Uses `safe-area-top` for notched devices.
- **Left nav:** **Desktop (lg+):** Fixed aside `w-56`, `DashboardNav` + `SignOutButton`, vertical scroll. **Mobile/tablet (&lt; lg):** Rendered inside **Drawer** (left panel, overlay, body scroll lock); closes on route change and overlay click.
- **Main:** Scrollable area (`overflow-y-auto`), padding `p-4 lg:p-6`. Wraps all dashboard children via `DashboardGate` (requires company when applicable).
- **Global UI:** `MessageBar`, `GlobalProcessingIndicator`, `NavigationLoading` rendered at root.

**Nav items (when company exists):** Dashboard, Company, Customers, Estimates, Sales Invoices, Items, Vendors, Purchase Invoices. Without company, only Company link is shown.

---

## 3. Entity layouts and routes

Below is the **layout and route structure for each entity**.

---

### 3.1 Dashboard (home)

| Route | Layout | Content |
|-------|--------|--------|
| `/dashboard` | Single column, max-width 1600px | Title "Dashboard", short copy (company name or "Create your company"). If no company: single **card** with "Create your company first" and a **+** (add) button linking to `/dashboard/company`. |

- **No sidebar.** Single scrollable main area.
- **Components:** `Link`, `card`, `btn btn-add btn-icon`, Lucide `Plus`.

---

### 3.2 Company

| Route | Layout | Content |
|-------|--------|--------|
| `/dashboard/company` | Full-width column, negative margin wrapper | **CompanyProfile**: either **CompanyView** (read-only) or **CompanyForm** (create/edit). Toggle edit via **CompanyProfile** state. |

- **Layout:** `CompanyLayout` wraps with `-m-6` and flex column. No sidebar, no top bar.
- **Views:** Create (no company) → **CompanyForm**. Existing company → **CompanyView** with edit button → **CompanyForm** (edit) with Save/Cancel.
- **Components:** Form fields (native inputs), tax rates (sales + withholding), logo, prefixes. Uses design-system inputs and buttons.

---

### 3.3 Customers

| Route | Layout | Content |
|-------|--------|--------|
| `/dashboard/customers` | **Responsive list** | **Desktop (lg+):** **CustomerSpreadsheetView** (full width). **Below lg:** **CustomersTopBar** + **CustomerSidebar** (card list in main). No placeholder; list is always shown. |
| `/dashboard/customers/new` | Main only | **CustomerForm** in main (create). Back → list with preserved params. |
| `/dashboard/customers/[id]` | Main only | **CustomerDetailView**. Back → list with `?page=&perPage=&highlight=<id>` (and search/filters). |
| `/dashboard/customers/[id]/edit` | Main only | **CustomerForm** (edit). Back → detail; list link → list with params. |
| `/dashboard/customers/import` | — | Import flow (CSV). |

**Layout hierarchy:**  
`CustomersLayout` → `CustomersTopBarProvider` → `Suspense` → **CustomersDataLoader** → **CustomersDataProvider** → **CustomersViewSwitcher** (main only; no sidebar) → children.

- **CustomersViewSwitcher:** Renders only **main** (no aside, no drawer). Layout choice is made inside **CustomersPageContent** by breakpoint.
- **CustomersPageContent (index):** At **lg+** renders **CustomerSpreadsheetView**; below **lg** renders **CustomersTopBar** (title, New, Export, Import; no view switcher) + **CustomerSidebar** as the list in main.
- **CustomerSidebar:** Search input, optional selection bar, virtualized list of customer cards (link to detail with page/perPage/q), pagination footer with **PerPageDropdown** (Radix), range, prev/next. Uses `@tanstack/react-virtual`. Used as the main list on small screens.
- **Top bar (list/detail/edit):** **CustomersTopBar** — **sticky** below lg. On list (mobile): title, New, Export CSV, Import (no view switcher). Detail/edit: back + title + actions (Edit, Delete, Copy, New estimate, New invoice).
- **Detail view:** **CustomerDetailView** — back link to list with `highlight`, `page`, `perPage`, `q`; customer name, contact/address/phone/email/NTN, estimates/invoices counts, action buttons. **Mobile:** Optional **sticky bottom action bar** (Back, Edit, Delete) with safe-area padding.

---

### 3.4 Vendors

| Route | Layout | Content |
|-------|--------|--------|
| `/dashboard/vendors` | **Responsive list** | **Desktop (lg+):** **VendorSpreadsheetView** (full width). **Below lg:** **VendorsTopBar** + **VendorSidebar** (card list in main). |
| `/dashboard/vendors/new` | Main only | **VendorForm** (create). Back → list with preserved params. |
| `/dashboard/vendors/[id]` | Main only | **VendorDetailView**. Back → list with `?page=&perPage=&highlight=<id>` (and search/filters). |
| `/dashboard/vendors/[id]/edit` | Main only | **VendorForm** (edit). Back → detail; list link → list with params. |
| `/dashboard/vendors/import` | — | Import (CSV). |

**Layout hierarchy:**  
`VendorsLayout` → `VendorsTopBarProvider` → **VendorsDataLoader** → **VendorsDataProvider** → **VendorsViewSwitcher** (main only) → children.

- **VendorsViewSwitcher:** Renders only **main**. Layout by breakpoint in **VendorsPageContent**.
- **VendorsPageContent (index):** **lg+** → **VendorSpreadsheetView**; below **lg** → **VendorsTopBar** + **VendorSidebar** in main.
- **VendorSidebar:** Search, virtualized vendor list, pagination with **PerPageDropdown**. Same UX as CustomerSidebar.
- **Top bar:** **VendorsTopBar** — on list (mobile): title, New, Export, Import (no view switcher). Detail: back + title + Edit/Delete etc.
- **Detail view:** **VendorDetailView** — back to list with `highlight`, `page`, `perPage`, `q`; vendor info, link to Purchase Invoices (e.g. `?vendorId=…`).

---

### 3.5 Items

| Route | Layout | Content |
|-------|--------|--------|
| `/dashboard/items` | **Responsive list** | **Desktop (lg+):** **ItemSpreadsheetView** (full width). **Below lg:** **ItemsTopBar** + **ItemSidebar** (card list in main). |
| `/dashboard/items/new` | Main only | **ItemForm** (create). Back → list with preserved params. |
| `/dashboard/items/[id]` | Main only | **ItemDetailView**. Back → list with `?page=&perPage=&highlight=<id>` (and search/filters). |
| `/dashboard/items/[id]/edit` | Main only | **ItemForm** (edit). Back → detail; list link → list with params. |
| `/dashboard/items/import` | — | Import (CSV). |

**Layout hierarchy:**  
`ItemsLayout` → `ItemsTopBarProvider` → **ItemsDataLoader** → **ItemsDataProvider** → **ItemsViewSwitcher** (main only) → children.

- **ItemsViewSwitcher:** Renders only **main**. Layout by breakpoint in **ItemsPageContent**.
- **ItemsPageContent (index):** **lg+** → **ItemSpreadsheetView**; below **lg** → **ItemsTopBar** + **ItemSidebar** in main.
- **ItemSidebar:** Search, virtualized item list, pagination with **PerPageDropdown**.
- **Top bar:** **ItemsTopBar** — on list (mobile): title, New, Export, Import (no view switcher). Detail/edit: back + title + actions.

---

### 3.6 Estimates

| Route | Layout | Content |
|-------|--------|--------|
| `/dashboard/estimates` | **Sidebar + main** | **EstimateSidebarWithData** (left, w-80) + **EstimatesTopBar** + main. Index: placeholder "Select an estimate…". |
| `/dashboard/estimates/new` | Sidebar + main | **EstimateSidebarWithData** + **EstimatesTopBar** + **EstimateForm** in main. |
| `/dashboard/estimates/import` | Sidebar + main | **EstimateSidebarWithData** + **EstimatesTopBar** + import CSV UI. |
| `/dashboard/estimates/[id]` | Sidebar + main | **EstimateSidebarWithData** + **EstimatesTopBar** + **EstimateDocumentView** (read-only document). |
| `/dashboard/estimates/[id]/edit` | Sidebar + main | **EstimateSidebarWithData** + **EstimatesTopBar** + **EstimateForm** in main. |

**Layout hierarchy:**  
`EstimatesLayout` → **EstimatesResponsiveLayout** (client; receives `sidebarContent` and children) → **EstimatesTopBarProvider** → **EstimatesTopBar** → scrollable children. Sidebar content: `Suspense` + **EstimateSidebarWithData**.

- **EstimatesResponsiveLayout:** At **lg+** aside (w-80) with sidebar content; below **lg** sidebar in **Drawer** (opened by "List" in top bar). Provides **EstimatesListDrawerContext**.
- **EstimateSidebarWithData:** Fetches estimates, renders **EstimateSidebar** (search, filters, virtualized list, **PerPageDropdown**, pagination). No spreadsheet view.
- **EstimatesTopBar:** Sticky below lg; "List" (below lg), Back when not on index, title (context-based), **New estimate**, **Import from CSV**. Context: **EstimatesTopBarContext**, **EstimatesListDrawerContext**.
- **Document view:** **EstimateDocumentView** — A4-style document (company, estimate number, date, customer, line items, totals). Uses `.document-page` and related classes. On small screens, wrapper can use horizontal scroll if needed.

---

### 3.7 Sales (Invoices)

| Route | Layout | Content |
|-------|--------|--------|
| `/dashboard/sales` | **Sidebar + main** | **InvoiceSidebarWithData** (left, w-80) + **InvoicesTopBar** + main. Index: placeholder "Select an invoice…". |
| `/dashboard/sales/new` | Sidebar + main | **InvoiceSidebarWithData** + **InvoicesTopBar** + **InvoiceForm** in main. |
| `/dashboard/sales/[id]` | Sidebar + main | **InvoiceSidebarWithData** + **InvoicesTopBar** + **InvoiceDocumentView** (read-only invoice). |
| `/dashboard/sales/[id]/edit` | Sidebar + main | **InvoiceSidebarWithData** + **InvoicesTopBar** + **InvoiceForm** in main. |

**Layout hierarchy:**  
`SalesLayout` → **SalesResponsiveLayout** (client; receives `sidebarContent` and children) → **InvoicesTopBarProvider** → **InvoicesTopBar** → children. Sidebar content: `Suspense` + **InvoiceSidebarWithData**.

- **SalesResponsiveLayout:** At **lg+** aside (w-80) with sidebar content; below **lg** sidebar in **Drawer** ("List" in top bar). Provides **InvoicesListDrawerContext**.
- **InvoiceSidebarWithData:** Fetches invoices, renders **InvoiceSidebar** (search, optional customer filter, virtualized list of invoice cards with Edit/Delete per row, **PerPageDropdown**, pagination). Cards are clickable divs (router.push); Edit is a button (no nested links).
- **InvoicesTopBar:** Sticky below lg; "List" (below lg), Back when not on index, context title, **New invoice**. Context: **InvoicesTopBarContext**, **InvoicesListDrawerContext**.
- **Document view:** **InvoiceDocumentView** — A4-style invoice (company, number, date, customer, line items, totals, optional estimate ref). Uses `.document-page` and doc-* classes.

---

### 3.8 Purchase Invoices

| Route | Layout | Content |
|-------|--------|--------|
| `/dashboard/purchases` | — | **Nav only.** Route not implemented; nav link exists. Vendors detail view links to `/dashboard/purchases?vendorId=…` and revalidatePath references this path. |

---

## 4. Layout patterns summary

| Entity | Sidebar | Top bar | List view | Detail view | Form (new/edit) | Special views |
|--------|---------|---------|-----------|-------------|------------------|----------------|
| Dashboard | No | No | — | — | — | — |
| Company | No | No | — | CompanyView | CompanyForm | — |
| Customers | Yes (w-80) | Yes (CustomersTopBar) | Sidebar list + placeholder | CustomerDetailView | CustomerForm | Spreadsheet (no sidebar) |
| Vendors | Yes (w-80) | Yes (VendorsTopBar) | Sidebar list + placeholder | VendorDetailView | VendorForm | Spreadsheet (no sidebar) |
| Items | Yes (w-80) | Yes (ItemsTopBar) | Sidebar list + placeholder | ItemDetailView | ItemForm | Spreadsheet (no sidebar) |
| Estimates | Yes (w-80) | Yes (EstimatesTopBar) | Sidebar list + placeholder | EstimateDocumentView | EstimateForm | Import CSV |
| Sales | Yes (w-80) | Yes (InvoicesTopBar) | Sidebar list + placeholder | InvoiceDocumentView | InvoiceForm | — |
| Purchases | — | — | — | — | — | Not implemented |

**Common sidebar width:** `w-80` (20rem).  
**Common top bar:** Border-bottom, flex row (back + title + actions), uses `btn btn-secondary btn-icon` for back, `btn btn-add btn-icon` for primary action. Below **lg** all entity top bars are **sticky** (`max-lg:sticky max-lg:top-0 max-lg:z-10`).

**Responsive breakpoints:** Tailwind defaults. **lg (1024px+):** Desktop — fixed nav + fixed entity sidebar + main. **Below lg:** Nav and entity sidebars become **slide-over drawers**; main is full width; "List" or hamburger opens the drawer.

---

## 4.1 Responsive behavior summary

| Breakpoint | Global nav | Entity sidebar (Customers, Vendors, Items, Estimates, Sales) | Main content |
|------------|------------|-------------------------------------------------------------|--------------|
| **lg (1024px+)** | Fixed aside `w-56` | Fixed aside `w-80` | Flex-1, scrollable, `p-6` |
| **&lt; lg** | Drawer (hamburger in header) | Drawer ("List" in entity top bar) | Full width, `p-4`; top bar sticky |

- Drawers use the shared **Drawer** component (left panel, overlay, body scroll lock, close on route change / overlay / Escape).
- Entity top bars are **sticky** below lg so actions stay visible when scrolling.
- **Touch targets:** Below 1024px, `.btn-icon` has min 44px. **Safe areas:** Header uses `safe-area-top`; optional bottom bars use `env(safe-area-inset-bottom)`.

---

## 5. Design system (reference)

- **Colors:** All via CSS variables in `src/app/globals.css` (e.g. `--color-bg-base`, `--color-surface`, `--color-primary`, `--color-on-surface`, `--color-outline`). Light/dark via `data-theme="light"` / `data-theme="dark"` and `prefers-color-scheme`.
- **Elevation:** Base → surface → elevated (modals, dropdowns). Shadows: `--shadow-sm`, `--shadow-md`, `--shadow-elevated`.
- **Typography:** Roboto; headings use `text-[var(--color-on-surface)]`; body/paragraphs use `text-[var(--color-on-surface-variant)]`.
- **Components (CSS):** `.btn`, `.btn-md`, `.btn-sm`, `.btn-icon`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-edit`, `.btn-add`; `.input-base`; `.card`; `.document-page`, `.document-page-header/content/footer`, `.doc-*`; `.estimate-status-badge`; `.badge-success`; `.line-items-table` with row hover/drag classes. **Mobile:** Below 1024px, `.btn-icon` uses min 44px (2.75rem) for touch targets; `.safe-area-top` / `.safe-area-bottom` use `env(safe-area-inset-*)`.
- **React components:**  
  - **Dialogs / overlay:** `Modal`, `ConfirmDialog` (both use Radix Dialog; same props, focus trap + Escape).  
  - **Drawer:** `Drawer` — left slide-over panel, overlay, body scroll lock, optional title/close; used for global nav and entity sidebars below lg.  
  - **Dropdowns:** `PerPageDropdown` — Radix DropdownMenu, used in all entity sidebars for "per page" selector.  
  - **Dates:** `DateInput` (DD/MM/YYYY text); `DateInputWithPicker` — same API plus calendar icon that opens Radix Popover with react-day-picker.  
  - **Other:** `IconButton`, `MessageBar`, `GlobalProcessingIndicator`, `DashboardNav`, `DocumentHeader`, `LineItemsEditor`, `ThemeToggle`, `ConnectionUnavailable`.  
  - **Hooks:** `useMediaQuery(query)` (e.g. `(min-width: 1024px)` for lg) in `src/hooks/useMediaQuery.ts`.

---

## 6. File reference (key layout/components)

| Entity | Layout file | Responsive wrapper | Data/context | Sidebar component | Top bar | Main content (examples) |
|--------|-------------|--------------------|-------------|--------------------|--------|---------------------------|
| Dashboard | (dashboard)/layout | DashboardShell | — | — (nav in Shell) | — | dashboard/page.tsx |
| Company | company/layout.tsx | — | — | — | — | CompanyProfile, CompanyView, CompanyForm |
| Customers | customers/layout.tsx | — | CustomersDataLoader, CustomersDataContext, CustomersTopBarProvider, **CustomersListDrawerProvider** (in ViewSwitcher) | CustomerSidebar (in CustomersViewSwitcher; drawer below lg) | CustomersTopBar | CustomersPageContent, CustomerDetailView, CustomerForm, CustomerSpreadsheetView |
| Vendors | vendors/layout.tsx | — | VendorsDataLoader, VendorsDataContext, VendorsTopBarProvider, **VendorsListDrawerProvider** | VendorSidebar (in VendorsViewSwitcher; drawer below lg) | VendorsTopBar | VendorsPageContent, VendorDetailView, VendorForm, VendorSpreadsheetView |
| Items | items/layout.tsx | — | ItemsDataLoader, ItemsDataContext, ItemsTopBarProvider, **ItemsListDrawerProvider** | ItemSidebar (in ItemsViewSwitcher; drawer below lg) | ItemsTopBar | ItemsPageContent, ItemDetailView, ItemForm, ItemSpreadsheetView |
| Estimates | estimates/layout.tsx | **EstimatesResponsiveLayout** | EstimateSidebarWithData (passed as sidebarContent), EstimatesTopBarProvider, **EstimatesListDrawerProvider** | EstimateSidebar (in Drawer below lg) | EstimatesTopBar | EstimatesPage, EstimateForm, EstimateDocumentView, import |
| Sales | sales/layout.tsx | **SalesResponsiveLayout** | InvoiceSidebarWithData (sidebarContent), InvoicesTopBarProvider, **InvoicesListDrawerProvider** | InvoiceSidebar (in Drawer below lg) | InvoicesTopBar | Sales page, InvoiceForm, InvoiceDocumentView |

**Shared components:** `Drawer` (src/components/Drawer.tsx), `PerPageDropdown` (src/components/PerPageDropdown.tsx), `DateInputWithPicker` (src/components/DateInputWithPicker.tsx). **Hooks:** `useMediaQuery` (src/hooks/useMediaQuery.ts).

This document can be updated when new entities or views are added.
