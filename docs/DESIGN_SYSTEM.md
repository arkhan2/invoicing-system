# Invoicing System — UI Design System Blueprint

A **page-by-page and component-by-component** specification using the app’s existing Tailwind + CSS variables. Use this as the single source of truth for layout, spacing, colors, and states.

---

## 1. Design tokens (reference)

All UI must use **semantic CSS variables** from `src/app/globals.css`. No raw hex in components.

### Elevation layers (60-30-10 rule)

| Layer | Token | Tailwind | Use | Luminosity |
|-------|-------|----------|-----|------------|
| **Base** | `--color-bg-base` | `bg-base` | Page background, main content area (60%) | Deepest |
| **Surface** | `--color-bg-surface` | `bg-surface` | Cards, sidebars, primary containers (30%) | Mid |
| **Elevated** | `--color-bg-elevated` | `bg-elevated` | Modals, dropdowns, popovers (10%) | Lightest + shadow |

**Luminosity shifting:** Each layer rises in elevation (slightly lighter in light mode, lighter in dark mode). Elevated uses `shadow-elevated` for depth in light mode and soft lift in dark mode.

**WCAG AA:** All `--color-on-base`, `--color-on-surface`, `--color-on-elevated` text meets 4.5:1 contrast.

### Other tokens

| Token | Use |
|-------|-----|
| `--color-surface` | Alias for surface layer (sidebar, cards) |
| `--color-surface-variant` | Table header, alternating row tint, selection bars |
| `--color-card-bg` | Legacy; prefer `--color-bg-surface` |
| `--color-card-text` | Card body text |
| `--color-on-surface` | Primary text, headings |
| `--color-on-surface-variant` | Secondary text, labels, hints |
| `--color-outline` | Card/container border, input border (one border per section) |
| `--color-divider` | Soft list/table row separators (no harsh lines) |
| `--color-primary` | Primary actions, links, selected accent bar |
| `--color-primary-container` | Row hover, selected card tint, nav active |
| `--color-on-primary-container` | Text on primary-container |
| `--color-secondary` | Secondary accent, positive badges |
| `--color-error` | Errors, danger actions |
| `--color-input-bg` | Input/textarea/select background |
| `--color-placeholder` | Placeholder text |
| `--color-btn-primary-bg` / `-hover` | Primary button |
| `--color-btn-secondary-bg` / `-hover` | Secondary button |
| `--color-btn-danger-bg` / `-hover` | Danger button |
| `--color-badge-success-bg` / `-text` | Success badges |
| `--radius-sm` (8px) | Small controls |
| `--radius-md` (12px) | Cards, buttons, inputs |
| `--radius-lg` (16px) | Modals |
| `--radius-pill` | Badges, tags |
| `--transition-fast` (150ms) | Micro feedback |
| `--transition-normal` (200ms) | Hover, focus |

**Rules:** One border OR one shadow per section. No double borders. Focus states always visible.

---

## 2. Page-by-page layout & component rules

### A. Dashboard page

**Purpose:** Overview, KPIs, summary cards, optional charts.

| Rule | Implementation |
|------|----------------|
| **Header** | Sticky; page title (left) + top-right actions. Use existing layout header. |
| **Page container** | `max-w-[1600px] mx-auto w-full flex flex-col gap-8` (32px between sections). |
| **Section gap** | 32–48px → use `gap-8` (32px) or `gap-10` (40px) / `gap-12` (48px). |
| **Card grid** | 2–3 per row: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4` or `gap-6` (16–24px). |
| **Card height** | Equal in row: `flex flex-col h-full` on card, or `grid` with equal rows. |

**Dashboard card (KPI / summary):**

- Container: `card p-6` (24px padding), rounded via `.card` (12px).
- Shadow: optional soft only → `shadow-[var(--shadow-sm)]`; if used, prefer **no** extra border (single-border rule: border **or** shadow).
- Title: single-line, `text-lg font-semibold text-[var(--color-on-surface)] truncate`.
- Body: wrap allowed, `text-sm text-[var(--color-on-surface-variant)]`; use `line-clamp-2` or natural wrap as needed.
- Icons/badges: `--color-secondary` or `--color-tertiary-container` for emphasis.
- Actions: bottom-right only, e.g. `mt-auto pt-4 flex justify-end`; use `btn-sm` or `btn-md`.

**Charts:**

- Primary data: `--color-primary`.
- Comparison / secondary: `--color-secondary`.
- Tertiary: sparingly for emphasis.

---

### B. List / table page (Customers, Estimates, Invoices)

**Purpose:** Scan and manage lists; efficient density without clutter.

| Rule | Implementation |
|------|----------------|
| **Page container** | `max-w-[1600px] mx-auto w-full flex flex-col gap-8`. |
| **Card** | One card per page: no extra `.card` wrapper; custom card = header + body with single border. |
| **Header** | One row: search/filters (left), primary action (right). `border-b border-[var(--color-divider)] px-5 py-4`. |
| **Body** | `flex flex-col gap-4 p-5` (20px padding). |

**Table container:**

- Wrapper: `max-h-[70vh] overflow-auto rounded-xl border border-[var(--color-outline)]`.
- Table: `w-full min-w-[600px] text-left text-sm`.

**Table header:**

- Sticky: `sticky top-0 z-10 bg-[var(--color-surface-variant)] shadow-[0_1px_0_0_var(--color-divider)]`.
- Cells: `p-3 font-medium text-[var(--color-on-surface)]`. Numbers: `text-right`. Actions column: `w-28 shrink-0 p-3 text-right` (or similar).

**Table rows:**

- **Separators:** `border-b border-[var(--color-divider)] last:border-b-0` (soft line; no harsh outline).
- **Alternating:** `even:bg-[var(--color-surface-variant)]/10`.
- **Hover:** `hover:bg-[var(--color-primary-container)]/20 transition-colors duration-150`.
- **Selected:** `bg-[var(--color-primary-container)]/30` or left accent: `border-l-2 border-l-[var(--color-primary)]` (choose one).
- **Cells:** `p-3`. Numbers: `text-right tabular-nums`. Text: `truncate` + `title={fullText}` for tooltip. Long names/descriptions: allow wrap or `line-clamp-2`; IDs/codes: single-line truncate.

**Buttons in table:**

- Inline: `btn-sm` only. Never full-width in a row. Actions column: `flex justify-end gap-2`.

**Empty state:**

- Container: `rounded-xl border border-dashed border-[var(--color-outline)] bg-[var(--color-surface-variant)]/30 px-6 py-10 text-center`.
- Copy: short (“No customers yet.” / “No matches.”). Primary action: `btn btn-primary btn-sm mt-3`.

**Selection bar (when items selected):**

- `rounded-xl border border-[var(--color-divider)] bg-[var(--color-surface-variant)]/50 px-4 py-2`, with “X selected”, Delete, Clear.

---

### C. Form / edit page

**Purpose:** Data entry and editing; clarity over density.

| Rule | Implementation |
|------|----------------|
| **Container** | `max-w-2xl` or `max-w-[1200px]` (1100–1200px), `flex flex-col`. |
| **Header** | One row: page title (left), primary submit (right). `border-b border-[var(--color-outline)] px-6 py-4`. |
| **Body** | `flex flex-col gap-8 p-6` (24px padding, 32px between sections). |

**Inputs:**

- Single-line: IDs, codes, short fields. Use `input-base` or Tailwind equivalent: `border border-[var(--color-outline)] rounded-xl px-3 py-2.5 ... focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]`.
- Textarea: notes/description; default 3 rows; expand on focus if needed. Same border/radius/focus as input.
- Labels: always above input; `block text-sm font-medium text-[var(--color-on-surface)] mb-1.5`.
- Horizontal group: only for related short fields (e.g. width / depth / height); keep compact.

**Buttons:**

- Primary: bottom-right or in header (e.g. “Save”) → `btn btn-primary btn-md`.
- Secondary / Cancel: `btn btn-secondary btn-sm` or `btn-md`; place left of primary or in modal footer.

**Spacing:**

- 16px between controls within a section (`space-y-4` or `gap-4`).
- 24px padding in form card (`p-6`).
- Sections: `gap-8` between logical blocks.

---

### D. Detail / read-only page

**Purpose:** View content or metadata; clear hierarchy.

| Rule | Implementation |
|------|----------------|
| **Layout** | Two columns: main (left), metadata/actions (right). Use grid or flex; right column can be narrower. |
| **Cards/sections** | Single border: `border border-[var(--color-outline)]`. Padding: `p-6` (24px). Rounded: `rounded-xl` (12px). |
| **Text** | Long descriptions: wrap. Short fields: single-line. Use `text-[var(--color-on-surface)]` and `text-[var(--color-on-surface-variant)]` for secondary. |
| **Badges / icons** | Positive: `--color-secondary` or `--color-badge-success-bg`. Negative: `--color-error`. Neutral: `--color-surface-variant` + `--color-on-surface-variant`. |

---

### E. Buttons & card color states

**Problem:** Selected vs unselected must be clearly distinct.

**Cards:**

| State | Implementation |
|-------|----------------|
| Default | `bg-[var(--color-card-bg)]` (and `.card` border). |
| Hover | Soft tint: `hover:bg-[var(--color-primary-container)]/10` or subtle shadow (if not using border). |
| Selected | `bg-[var(--color-primary-container)]/20` or left bar: `border-l-4 border-l-[var(--color-primary)]`. |

**Buttons:**

| Type | Class | Hover | Disabled |
|------|--------|--------|----------|
| Primary | `btn btn-primary btn-md` / `btn-sm` | `--color-btn-primary-bg-hover` (already in CSS) | `opacity-50` (already in `.btn`) |
| Secondary | `btn btn-secondary btn-md` / `btn-sm` | `--color-btn-secondary-bg-hover` | same |
| Danger | `btn btn-danger btn-md` / `btn-sm` | `--color-btn-danger-bg-hover` | same |

**Inactive elements:**

- Text: `text-[var(--color-on-surface-variant)]`.
- Border/background: subtle; never bright. Disabled buttons: `disabled:opacity-50`.

---

### F. Customer list separator fix (summary)

- **Row lines:** Use `border-[var(--color-divider)]`, not `--color-outline` at full opacity.
- **Header bottom:** `shadow-[0_1px_0_0_var(--color-divider)]`.
- **Row hover:** `hover:bg-[var(--color-primary-container)]/20` (tint, not thick line).
- **Selected row:** `bg-[var(--color-primary-container)]/30` or left accent bar `border-l-2 border-l-[var(--color-primary)]`.
- **Alternating:** `even:bg-[var(--color-surface-variant)]/10` for separation without relying only on borders.

---

## 3. Color mapping by component

| Component | Background | Text / border | Accent / notes |
|-----------|------------|----------------|----------------|
| Page / main area | `bg-base` | `--color-on-base` | — |
| Card | `bg-surface` / `--color-bg-surface` | `--color-on-surface` | Selected: left bar `--color-primary` or tint `--color-primary-container` |
| Sidebar | `bg-surface` | `--color-on-surface` | — |
| Modal / dropdown | `bg-elevated` + `shadow-elevated` | `--color-on-elevated` | — |
| Primary button | `--color-btn-primary-bg` | `--color-btn-primary-text` | Hover: `--color-btn-primary-bg-hover` |
| Secondary button | `--color-btn-secondary-bg` | `--color-btn-secondary-text` | Hover: `--color-btn-secondary-bg-hover` |
| Danger button | `--color-btn-danger-bg` | `--color-btn-danger-text` | Hover: `--color-btn-danger-bg-hover` |
| Badge success | `--color-badge-success-bg` | `--color-badge-success-text` | — |
| Table header | `--color-surface-variant` | `--color-on-surface` | Bottom line: `--color-divider` |
| Table row default | transparent / card-bg | `--color-on-surface` | — |
| Table row even | `--color-surface-variant`/10 | — | — |
| Table row hover | `--color-primary-container`/20 | — | — |
| Table row selected | `--color-primary-container`/30 or accent bar | — | `--color-primary` for bar |
| Table dividers | — | `--color-divider` | — |

---

## 4. Component blueprint (copy-paste ready)

### Card types

**KPI / dashboard card (border only, no shadow):**

```html
<div class="card p-6 flex flex-col h-full">
  <h3 class="text-lg font-semibold text-[var(--color-on-surface)] truncate">Title</h3>
  <p class="mt-1 text-sm text-[var(--color-on-surface-variant)]">Body text.</p>
  <div class="mt-auto pt-4 flex justify-end">
    <button type="button" class="btn btn-primary btn-sm">Action</button>
  </div>
</div>
```

**Form card (header + body):**

```html
<div class="flex flex-col">
  <div class="flex items-center justify-between gap-4 border-b border-[var(--color-outline)] px-6 py-4">
    <h2 class="text-lg font-semibold text-[var(--color-on-surface)]">Form title</h2>
    <button type="submit" class="btn btn-primary btn-md">Save</button>
  </div>
  <div class="flex flex-col gap-8 p-6">
    <!-- sections -->
  </div>
</div>
```

**List card (table page):**

```html
<div class="flex flex-col">
  <div class="flex items-center justify-between gap-4 border-b border-[var(--color-divider)] px-5 py-4">
    <input type="search" class="..." placeholder="Search…" />
    <button type="button" class="btn btn-primary btn-sm">Add item</button>
  </div>
  <div class="flex flex-col gap-4 p-5">
    <!-- selection bar if needed, then table or empty state -->
  </div>
</div>
```

**Detail card (read-only section):**

```html
<section class="rounded-xl border border-[var(--color-outline)] bg-[var(--color-card-bg)] p-6">
  <h2 class="text-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)] mb-4">Section</h2>
  <p class="text-[var(--color-on-surface)]">Content. Long text wraps.</p>
</section>
```

---

### Buttons

| Use | Markup |
|-----|--------|
| Primary (header / CTA) | `<button class="btn btn-primary btn-md">Save</button>` |
| Primary (table inline) | `<button class="btn btn-primary btn-sm">Add</button>` |
| Secondary | `<button class="btn btn-secondary btn-sm">Cancel</button>` |
| Danger | `<button class="btn btn-danger btn-sm">Delete</button>` |
| Disabled | Add `disabled`; opacity handled by `.btn`. |

---

### Table (list page)

**Wrapper + thead:**

```html
<div class="max-h-[70vh] overflow-auto rounded-xl border border-[var(--color-outline)]">
  <table class="w-full min-w-[600px] text-left text-sm">
    <thead class="sticky top-0 z-10 bg-[var(--color-surface-variant)] shadow-[0_1px_0_0_var(--color-divider)]">
      <tr>
        <th class="p-3 font-medium text-[var(--color-on-surface)]">Name</th>
        <th class="w-24 shrink-0 p-3 text-right font-medium text-[var(--color-on-surface)]">Total</th>
        <th class="w-28 shrink-0 p-3 text-right" aria-label="Actions"></th>
      </tr>
    </thead>
    <tbody>
      <!-- rows -->
    </tbody>
  </table>
</div>
```

**Body row (with alternating + hover + soft divider):**

```html
<tr class="border-b border-[var(--color-divider)] last:border-b-0 even:bg-[var(--color-surface-variant)]/10 hover:bg-[var(--color-primary-container)]/20 transition-colors duration-150">
  <td class="max-w-[200px] truncate p-3 font-medium text-[var(--color-on-surface)]" title="Full name">Name</td>
  <td class="w-24 shrink-0 p-3 text-right tabular-nums text-[var(--color-on-surface)]">0.00</td>
  <td class="w-28 shrink-0 p-3 text-right">
    <div class="flex justify-end gap-2">
      <button type="button" class="btn btn-secondary btn-sm">Edit</button>
      <button type="button" class="btn btn-danger btn-sm">Delete</button>
    </div>
  </td>
</tr>
```

**Selected row (e.g. newly created):** add `bg-[var(--color-primary-container)]/30` to the row class list.

---

### Badges

**Success (e.g. status):**

```html
<span class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-[var(--color-badge-success-bg)] text-[var(--color-badge-success-text)]">Active</span>
```

**Neutral:**

```html
<span class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-[var(--color-surface-variant)] text-[var(--color-on-surface-variant)]">Draft</span>
```

---

## 5. Accessibility & polish

- **Contrast:** All text meets WCAG AA; use `--color-on-surface` and `--color-on-surface-variant` on appropriate backgrounds.
- **Inactive:** Muted but visible: `--color-on-surface-variant`; avoid blending into background.
- **Hover / focus:** Always visible; focus ring uses `--color-primary` (see `globals.css`).
- **Buttons & cards:** Distinct by color and/or shape; selected state clearly different from default and hover.
- **Tone:** Calm, professional; avoid bright or harsh contrasts; prefer subtle shadows and soft dividers.

---

## 6. Quick reference

| Spacing | Value | Use |
|---------|--------|-----|
| 8px | `gap-2`, `p-2` | Tight inline |
| 16px | `gap-4`, `p-4` | Between controls, card body (optional) |
| 20px | `p-5` | List card body padding |
| 24px | `p-6` | Form/dashboard card padding |
| 32px | `gap-8` | Between page sections |
| 48px | `gap-12` | Large section gap |

| Radius | Token | Use |
|--------|--------|-----|
| 8px | `--radius-sm` | Small controls |
| 12px | `--radius-md` | Cards, buttons, inputs |
| 16px | `--radius-lg` | Modals |
| Pill | `--radius-pill` | Badges |

Use this doc as the **single blueprint** for implementing and auditing UI across the app.
