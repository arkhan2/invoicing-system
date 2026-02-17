# UI Responsive & Headless Upgrade — Blueprint

This blueprint maps the **current 3-panel desktop layout** to **mobile and tablet** and specifies **headless component integration**. It is plug-and-play: follow the phases without changing existing visual design or layout hierarchy.

**Prerequisite:** [UI-DESIGN.md](./UI-DESIGN.md) (entity layouts and design system).

---

## 1. Breakpoints (Tailwind)

Use Tailwind defaults; no config change required unless you want named aliases:

| Token | Min width | Use in this app |
|-------|-----------|------------------|
| **default** | &lt; 640px | Mobile: single column, drawers, fullscreen detail |
| **sm** | 640px | Mobile boundary; sticky bars, drawer width |
| **md** | 768px | Tablet: optional compact nav; sidebars can still be drawers |
| **lg** | 1024px | **Desktop:** current 3-panel layout (nav + sidebar + main) |

**Rule of thumb:** Any “sidebar” (global nav or entity list) is **visible as a fixed column only at `lg:`**. Below `lg`, it becomes a **slide-over drawer**.

---

## 2. Desktop → Tablet → Mobile Layout Map

### 2.1 Global shell (`(dashboard)/layout.tsx`)

| Screen | Header | Left nav (DashboardNav) | Main content |
|--------|--------|--------------------------|--------------|
| **lg+** | Fixed top, full width | Fixed left `w-56`, scrollable | `flex-1` scrollable, `p-6` |
| **md** | Same | **Drawer** (closed by default; hamburger opens). Optional: icon-only strip when open. | Full width; padding `p-4 md:p-6` |
| **sm** | Same; logo + menu icon + theme only (hide email or truncate) | **Drawer** (hamburger opens) | Full width; padding `p-4` |

**Behavior:**

- **lg+:** Unchanged (current markup and classes).
- **&lt; lg:** 
  - Left nav is **not** in the document flow. It sits in a **drawer** (e.g. Radix Dialog or a custom panel) that opens from the left, overlay behind it, close on route change or outside click.
  - Header gets a **menu button** (hamburger) that opens the nav drawer. Menu button visible only below `lg`.
  - Main content uses `min-w-0 flex-1` so it isn’t constrained by the hidden nav.

**No layout hierarchy change:** `DashboardGate` and `main` structure stay; only the nav’s visibility and “drawer” wrapper are new.

---

### 2.2 Entity areas with sidebar (Customers, Vendors, Items, Estimates, Sales)

Current: **aside (w-80) + main** with optional **TopBar** above main.

| Screen | Entity sidebar (e.g. CustomerSidebar) | Top bar | Main (list placeholder / detail / form) |
|--------|----------------------------------------|---------|----------------------------------------|
| **lg+** | Fixed left `w-80`, scrollable | Above main, full width of main | As today |
| **md** | **Drawer** (closed by default). Button in top bar “List” or “☰” opens it. | Sticky top; same actions, possibly wrapped | Full width; detail/form full width |
| **sm** | **Drawer** (same). List → tap row → **fullscreen** detail (or form). | Sticky top; back + title + primary action | Single column; **detail view fullscreen** (no sidebar visible at same time) |

**Behavior:**

- **lg+:** Keep current layout: `<aside class="w-80 ...">` + `<main class="flex-1 ...">`. No changes.
- **&lt; lg:**
  - **Entity sidebar** (CustomerSidebar, VendorSidebar, ItemSidebar, EstimateSidebar, InvoiceSidebar) is **not** rendered in the flow. It is rendered inside a **slide-over drawer** (left, width e.g. `min(20rem, 100vw - 2rem)` or `w-80` max), with overlay. Opening it: a “List” or “☰” control in the **entity top bar** (CustomersTopBar, InvoicesTopBar, etc.).
  - **Main content** takes full width. On **list route** (e.g. `/dashboard/customers` without `[id]`): show placeholder or empty state and make “Open list” obvious. On **detail/form route**: show detail or form full width.
  - **Mobile (sm):** When user is on a **detail** or **edit** page, treat the main area as **fullscreen** (no sidebar visible). Back button in top bar returns to list (or opens list drawer, depending on UX choice; recommended: back = previous route, so list → detail → back = list).

**Sticky action bars (mobile):**

- **Top bar:** Already present; keep it **sticky** on small screens (`sticky top-0 z-10`) with back, title, and primary action (e.g. New customer, New invoice). Ensure it uses `bg-base` or `bg-elevated` so content doesn’t show through.
- **Bottom bar (optional, entity-specific):** On **detail view** on mobile, an optional **sticky bottom bar** with 2–4 actions (e.g. Edit, Delete, “New estimate”) so they’re always visible. Use `sticky bottom-0 z-10`, safe-area padding, and avoid overlapping virtualized list (list view doesn’t need bottom bar when the list is the main content).

**Virtualized lists:**

- Keep virtualizer scroll container with a **fixed height** (e.g. `calc(100vh - header - topBar)` or `flex-1 min-h-0` inside a flex column). On mobile, when the list is inside the **drawer**, the drawer content area should be the scroll parent and have `overflow-auto` and a constrained height so virtualization still works. No nested scroll conflicts: one scroll region per panel.

**Spreadsheet views:**

- Already full-width (no entity sidebar). On mobile, ensure table is horizontally scrollable and top bar stays sticky; no layout change beyond padding and possibly a simpler toolbar.

---

### 2.3 Company & Dashboard

- **Dashboard:** Already single column. Only tweaks: padding `p-4 sm:p-6`, max-width unchanged, card and button scale fine.
- **Company:** Same; single column. Form and view already stack; ensure inputs and buttons are touch-friendly (min touch target 44px).

---

## 3. Headless Component Integration

**Principle:** Use headless/primitives for **behavior** (focus, keyboard, touch, a11y); keep **all current Tailwind and CSS variable styling**.

### 3.1 Recommended packages

| Package | Purpose | Where used |
|---------|---------|------------|
| **@radix-ui/react-dialog** | Modal + focus trap + escape + overlay | Replace or wrap current `Modal`, `ConfirmDialog` |
| **@radix-ui/react-dropdown-menu** | Dropdown menus (per-page, filters, “More”) | Top bar actions, filter dropdowns, per-row actions |
| **@radix-ui/react-select** | Single/multi select (complex only) | Replace native `<select>` only where complex (e.g. searchable, multi-select); keep native for simple dropdowns |
| **@radix-ui/react-popover** | Popovers (date picker trigger, per-page options) | Date picker trigger, “per page” selector |
| **react-day-picker** (v8) | Date picker calendar | Wrap in Radix Popover; use with existing `DateInput` or replace for calendar UI |
| **@radix-ui/react-focus-scope** or **@radix-ui/react-dialog** | Focus trap | Modals and drawers (Dialog includes focus management) |

**Command palette (optional):** Use a small headless “command palette” (e.g. cmdk or custom with Radix) for global search/navigation; keyboard shortcut (e.g. Cmd+K). Not required for MVP of this blueprint.

### 3.2 Mapping to existing components

| Current | Action | Notes |
|--------|--------|--------|
| **Modal** (`src/components/Modal.tsx`) | Wrap content in Radix `Dialog.Root`, `Dialog.Portal`, `Dialog.Content`. Use `Dialog.Title`, `Dialog.Close`. Keep existing `contentClassName`, overlay, and Tailwind classes. | Preserve `open`/`onClose` API so call sites don’t change. |
| **ConfirmDialog** | Same: Radix Dialog; keep `open`, `onConfirm`, `onCancel`, `variant`, `loading`. Style with existing `btn`, `btn-danger`, `btn-secondary`. | — |
| **Entity sidebars** | Do **not** use Dialog. Use a **custom drawer**: fixed/absolute panel from left, overlay, close on outside click or route change. Optional: use Radix Dialog with `modal={false}` and custom positioning, or build with `data-state` and CSS. | Drawer slides from left; overlay `bg-black/50`; body scroll lock when open on mobile. |
| **Global nav** | Same as entity sidebars: custom drawer (or Radix Dialog) for “nav drawer” opened by hamburger. | — |
| **Dropdowns** (e.g. “per page”, filters) | Radix Dropdown or Popover. Trigger = current button; content = current list; keep Tailwind. | Replace only where there’s a custom dropdown today. |
| **DateInput** | Keep current DD/MM/YYYY input. Optional: add a **calendar popover** (react-day-picker inside Radix Popover) as alternative input; same value/onChange. | Desktop can keep typing; mobile can prefer calendar. |
| **Native &lt;select&gt;** | Keep for simple selects. Use Radix Select only for complex (e.g. customer search select, multi-select). | — |

All Radix components: apply `className` and use CSS variables (`var(--color-*)`) so they match the existing design system. No visual redesign.

---

## 4. Entity-Specific Implementation Notes

| Entity | Sidebar → drawer | Detail view | Sticky bars | Other |
|--------|------------------|------------|-------------|--------|
| **Customers** | CustomerSidebar in drawer &lt; lg | Fullscreen on sm | Top: back + title + New/Export/View. Bottom (optional): Edit, Delete on detail | Same TopBar; add “List” to open drawer when &lt; lg |
| **Vendors** | VendorSidebar in drawer &lt; lg | Fullscreen on sm | Same pattern | Same |
| **Items** | ItemSidebar in drawer &lt; lg | Fullscreen on sm | Same pattern | Same |
| **Estimates** | EstimateSidebar in drawer &lt; lg | Document view fullscreen on sm | Top: back + New + Import. Optional bottom on detail: Edit, Convert | Document page: keep `.document-page`; ensure horizontal scroll if needed on small screens |
| **Sales** | InvoiceSidebar in drawer &lt; lg | Document view fullscreen on sm | Top: back + New. Optional bottom on detail: Edit | Same as Estimates for document |
| **Company** | — | — | — | Padding `p-4` on sm |
| **Dashboard** | — | — | — | Padding `p-4` on sm |

**No changes:** Data loaders, context providers, virtualized list logic, or route structure. Only layout and “where” the sidebar is rendered (in flow vs in drawer) and optional sticky bottom bar.

---

## 5. Implementation Phases (incremental commits)

Suggested order so each step is reviewable and safe.

1. **Dependencies**  
   Add: `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-select`, `@radix-ui/react-popover`, `react-day-picker`.  
   Commit: “chore: add Radix and react-day-picker for headless UI”.

2. **Modal + ConfirmDialog**  
   Refactor `Modal` and `ConfirmDialog` to use Radix Dialog; keep props and styling.  
   Commit: “refactor(ui): use Radix Dialog for Modal and ConfirmDialog”.

3. **Global nav drawer**  
   In `(dashboard)/layout.tsx`: at &lt; lg, hide nav from flow and show hamburger; nav content in a left slide-over drawer; main full width.  
   Commit: “feat(layout): global nav as slide-over drawer on mobile and tablet”.

4. **Shared drawer component**  
   Create `Drawer` (or `SidebarDrawer`) component: overlay + left panel, open/onClose, optional `width`, children = sidebar content. Use for global nav first.  
   Commit: “feat(ui): add Drawer component for slide-over panels”.

5. **Customers: sidebar drawer + sticky top**  
   In CustomersViewSwitcher (or equivalent), at &lt; lg: render CustomerSidebar inside Drawer; add “List”/menu button to CustomersTopBar; main full width; top bar sticky on sm.  
   Commit: “feat(customers): sidebar as drawer and sticky top bar on mobile/tablet”.

6. **Customers: fullscreen detail on mobile**  
   On `/dashboard/customers/[id]` and `[id]/edit`, ensure main content is full width and no sidebar visible; optional sticky bottom actions.  
   Commit: “feat(customers): fullscreen detail view on mobile”.

7. **Replicate for Vendors, Items**  
   Same pattern: VendorsViewSwitcher, ItemsViewSwitcher; sidebar in drawer &lt; lg; sticky top bar; fullscreen detail.  
   Commits: “feat(vendors): sidebar drawer and mobile layout”, “feat(items): sidebar drawer and mobile layout”.

8. **Estimates: drawer + document**  
   EstimateSidebar in drawer &lt; lg; document view fullscreen; sticky top bar.  
   Commit: “feat(estimates): sidebar drawer and mobile document view”.

9. **Sales: drawer + document**  
   Same for InvoiceSidebar and invoice document.  
   Commit: “feat(sales): sidebar drawer and mobile document view”.

10. **Dropdowns / Select**  
    Replace any custom dropdown (e.g. per-page, filters) with Radix Dropdown or Select; keep styles.  
    Commit: “refactor(ui): use Radix for dropdowns and select where applicable”.

11. **Date picker (optional)**  
    Add react-day-picker in Radix Popover next to DateInput for optional calendar pick.  
    Commit: “feat(ui): optional calendar date picker with react-day-picker”.

12. **Polish**  
    Touch targets (min 44px), safe-area padding for sticky bars, test virtualized lists in drawers.  
    Commit: “fix(a11y): touch targets and safe areas for mobile”.

---

## 6. QA Checklist (from your spec)

- [ ] Desktop (lg+) layout and behavior unchanged.
- [ ] Mobile: single column; entity list in drawer; “List”/menu opens drawer.
- [ ] Mobile: detail/form views fullscreen; back returns to list.
- [ ] Modals and confirmations: keyboard (Escape), focus trap, and touch work.
- [ ] Dropdowns/selects: keyboard and touch; styled with design system.
- [ ] Sticky top bar (and optional bottom bar) visible and not overlapping list.
- [ ] Virtualized lists scroll correctly in drawer and in main.
- [ ] Document views (`.document-page`) keep layout; horizontal scroll if needed.
- [ ] No console errors or broken links; all entity routes tested.

---

## 7. File / Component Checklist (no visual redesign)

- **Keep unchanged:** All button/input/card classes, typography, colors, `globals.css` design tokens, virtualizer config, data loaders and context providers, route structure.
- **Add:** Drawer component, Radix wrappers for Modal/ConfirmDialog and (where needed) dropdowns/select, optional date popover.
- **Change only:** Where sidebars are rendered (conditional drawer vs aside) and responsive classes (e.g. `hidden lg:flex`, `lg:w-80`, `sticky top-0` on small screens).

This blueprint is ready to implement phase by phase with incremental, safe commits.
