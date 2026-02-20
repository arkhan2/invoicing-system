# Visual Design & Color System

This document lists all colors and visual tokens used in the project, how they behave in light and dark mode, and consistency guidelines.

---

## 1. Design principles

- **Semantic only:** Components use CSS variables (e.g. `var(--color-on-surface)`), not raw hex/rgb in TSX.
- **60-30-10 elevation:** 60% base (page), 30% surface (cards, sidebars), 10% elevated (modals, dropdowns). Each layer is slightly lighter in light mode and appropriately darker in dark mode.
- **WCAG AA:** All `on-*` text colors meet at least 4.5:1 contrast against their background.
- **Single source of truth:** All theme values live in `src/app/globals.css`. Tailwind only references these variables.

---

## 2. Theme application

| Mechanism | When it applies |
|-----------|------------------|
| **Default (no override)** | `:root` + `[data-theme="light"]` — light theme. |
| **System preference** | `@media (prefers-color-scheme: dark)` with `:root:not([data-theme="light"])` — dark theme when OS is dark and user has not forced light. |
| **Manual override** | `[data-theme="dark"]` or `[data-theme="light"]` — set by ThemeToggle and persisted in `localStorage` key `invoicing-theme`. |

Theme is applied in a blocking script in `src/app/layout.tsx` so the correct theme is set before first paint (avoids flash).

---

## 3. Color variables reference

### 3.1 Palette (reference swatches)

Used as a design reference; components should use the semantic variables below, not these directly.

| Token | Light | Dark | Notes |
|-------|--------|------|--------|
| `--palette-cream` | `#ebe9e6` | — | Light only |
| `--palette-warm-gray` | `#dddad6` | — | Light only |
| `--palette-dark` | `#3a3734` | — | Text/base dark |
| `--palette-primary` | `#5c8bc4` | — | Blue |
| `--palette-primary-dark` | `#4c7ab4` | — | Blue hover |
| `--palette-secondary` | `#5a9d96` | — | Teal |
| `--palette-tertiary` | `#8b6fa8` | — | Purple |
| `--palette-coral` | `#b87268` | — | Error/danger |
| `--palette-coral-dark` | `#a8645a` | — | Coral hover |
| `--palette-mint` | `#6cb8a8` | — | Success |

---

### 3.2 Elevation & backgrounds

| Variable | Light | Dark | Use |
|----------|--------|------|-----|
| `--color-bg-base` | `#dfdcd9` | `#14161a` | Page / main area. Tailwind: `bg-base`. |
| `--color-bg-surface` | `#e8e6e3` | `#1c1e22` | Cards, sidebars, panels. Tailwind: — (use `bg-surface` for legacy alias). |
| `--color-bg-elevated` | `#f5f3f0` | `#25282c` | Modals, dropdowns, popovers. Tailwind: `bg-elevated`. |
| `--color-surface` | `#e8e6e3` | `#1c1e22` | Legacy alias; same as surface. Tailwind: `bg-surface`. |
| `--color-surface-variant` | `#dfdcd9` | `#14161a` | Slightly different from base (e.g. selection bars). Tailwind: `bg-surface-variant` (via `surface.variant`). |
| `--color-card-bg` | `#e8e6e3` | `#1c1e22` | Card background (documented for .card and doc views). |
| `--color-card-text` | `#3a3734` | `#e2e0dd` | Default text on cards. |

---

### 3.3 Text (on-*)

| Variable | Light | Dark | Use |
|----------|--------|------|-----|
| `--color-on-base` | `#3a3734` | `#e4e2df` | Body text on base. Tailwind: `text-base-foreground` or direct. |
| `--color-on-surface` | `#3a3734` | `#e4e2df` / `#e2e0dd` | Primary text on surface/cards. |
| `--color-on-elevated` | `#3a3734` | `#e4e2df` | Text on elevated. Tailwind: `text-elevated-foreground`. |
| `--color-on-surface-variant` | `#5c5956` | `#9c9a96` | Secondary/muted text. |
| `--color-placeholder` | `#8a8682` | `#6a6864` | Input placeholders. |

---

### 3.4 Borders & dividers

| Variable | Light | Dark | Use |
|----------|--------|------|-----|
| `--color-outline` | `#b2aea8` | `#404348` | Default borders (cards, inputs, buttons). |
| `--color-divider` | `rgba(58,55,52,0.1)` | `rgba(255,255,255,0.06)` | Soft dividers (tables, list separators). |
| `--color-input-border` | `#a8a49e` | `#404348` | Input borders. |

---

### 3.5 Inputs

| Variable | Light | Dark | Use |
|----------|--------|------|-----|
| `--color-input-bg` | `#f5f3f0` | `#2a2c30` | Input/select/textarea background. |
| `--color-input-shadow` | `inset 0 1px 2px rgba(0,0,0,0.04)` | `none` | Optional input inner shadow. |

---

### 3.6 Primary (blue) — links, focus, primary actions

| Variable | Light | Dark | Use |
|----------|--------|------|-----|
| `--color-primary` | `#5c8bc4` | `#6c9cd4` | Primary color, focus ring. |
| `--color-primary-hover` | `#4c7ab4` | `#7cacdc` | Hover. |
| `--color-on-primary` | `#f0f4f8` | `#f0f4f8` | Text on primary fill. |
| `--color-primary-container` | `#c2d4ea` | `#2a3d58` | Light blue container / focus glow. |
| `--color-on-primary-container` | `#2d4a6a` | `#b8cce8` | Text on primary container. |

---

### 3.7 Secondary (teal) — add, success, secondary actions

| Variable | Light | Dark | Use |
|----------|--------|------|-----|
| `--color-secondary` | `#5a9d96` | `#6aada6` | Secondary accent. |
| `--color-secondary-container` | `#b8ddd8` | `#234a45` | Container. |
| `--color-on-secondary` | `#f0f8f6` | `#f0f8f6` | Text on secondary fill. |
| `--color-on-secondary-container` | `#234a45` | `#a8d8d2` | Text on container. |
| `--color-secondary-bg` | `#c8e4e0` | `rgba(106,173,166,0.32)` | Tint backgrounds. |

---

### 3.8 Tertiary (purple)

| Variable | Light | Dark | Use |
|----------|--------|------|-----|
| `--color-tertiary` | `#8b6fa8` | `#9b7eb8` | Tertiary accent. |
| `--color-tertiary-container` | `#ddd0e8` | `#3d3250` | Container. |

---

### 3.9 Error / danger

| Variable | Light | Dark | Use |
|----------|--------|------|-----|
| `--color-error` | `#a85a50` | `#d49088` | Error text, danger. |
| `--color-error-bg` | `#ecd8d6` | `rgba(200,130,120,0.32)` | Error background. |

---

### 3.10 Buttons (semantic)

| Variable | Light | Dark | Use |
|----------|--------|------|-----|
| `--color-btn-primary-bg` | `#4a7ab8` | `#5c9ce0` | .btn-primary |
| `--color-btn-primary-bg-hover` | `#3d6aa6` | `#70ace8` | |
| `--color-btn-primary-text` | `#f0f4f8` | `#f0f4f8` | |
| `--color-btn-secondary-bg` | `#b8b4af` | `#4a4e56` | .btn-secondary (back, cancel) |
| `--color-btn-secondary-bg-hover` | `#a8a39d` | `#5a5e68` | |
| `--color-btn-secondary-text` | `#2d2a28` | `#e8e6e4` | |
| `--color-btn-danger-bg` | `#a85a50` | `#c87268` | .btn-danger (delete) |
| `--color-btn-danger-bg-hover` | `#984a40` | `#d88878` | |
| `--color-btn-danger-text` | `#f8f2f0` | `#f8f2f0` | |
| `--color-btn-edit-bg` | `#b08050` | `#c89868` | .btn-edit (pencil) |
| `--color-btn-edit-bg-hover` | `#9c7040` | `#d8a878` | |
| `--color-btn-edit-text` | `#2d2018` | `#2d2018` | |
| `--color-btn-add-bg` | `#4a8d86` | `#5aad9e` | .btn-add (plus) |
| `--color-btn-add-bg-hover` | `#3d7d76` | `#6abdad` | |
| `--color-btn-add-text` | `#f0f8f6` | `#f0f8f6` | |

---

### 3.11 Badges & estimate status

| Variable | Light | Dark | Use |
|----------|--------|------|-----|
| `--color-badge-success-bg` | `#5aa894` | `#5ab8a4` | Success badge. |
| `--color-badge-success-text` | `#1a3830` | `#e8f6f2` | |
| `--color-estimate-draft-bg` | `#b5b2ad` | `#32343a` | Estimate status: draft. |
| `--color-estimate-draft-text` | `#383532` | `#b8b6b2` | |
| `--color-estimate-sent-bg` | `#b0cce8` | `#1e3548` | Sent. |
| `--color-estimate-sent-text` | `#1e3a52` | `#a8cce8` | |
| `--color-estimate-expired-bg` | `#e8d4d2` | `rgba(200,130,120,0.35)` | Expired. |
| `--color-estimate-expired-text` | `#703830` | `#e8c4bc` | |
| `--color-estimate-converted-bg` | `#5aa894` | `#2d5a50` | Converted. |
| `--color-estimate-converted-text` | `#1a3830` | `#b0e8dc` | |

---

### 3.12 Shadows

| Variable | Light | Dark | Use |
|----------|--------|------|-----|
| `--shadow-sm` | Light gray shadow | Black shadow | Cards, subtle lift. Tailwind: `shadow-card`. |
| `--shadow-md` | Medium gray shadow | Black shadow | Hover. Tailwind: `shadow-card-hover`. |
| `--shadow-elevated` | `0 8px 32px rgb(58 55 52/12%)...` | `0 8px 32px rgb(0 0 0/35%)...` | Modals, dropdowns. Tailwind: `shadow-elevated`. |

---

### 3.13 Other design tokens

| Token | Value | Use |
|-------|--------|-----|
| `--header-height` | `56px` | Fixed header height. |
| `--radius` | `8px` | Default radius. |
| `--radius-sm` | `8px` | Small radius. |
| `--radius-md` | `12px` | Medium (buttons, cards, inputs). |
| `--radius-lg` | `16px` | Large. |
| `--radius-pill` | `9999px` | Pills, badges. |
| `--transition-fast` | `150ms` | Quick transitions. |
| `--transition-normal` | `200ms` | Default transitions. |

---

## 4. Tailwind mapping

Defined in `tailwind.config.ts`:

| Tailwind class | Maps to |
|----------------|---------|
| `bg-base` | `var(--color-bg-base)` |
| `text-base-foreground` / `base-foreground` | `var(--color-on-base)` |
| `bg-surface` | `var(--color-surface)` |
| `bg-surface-variant` (via `surface.variant`) | `var(--color-surface-variant)` |
| `bg-elevated` | `var(--color-bg-elevated)` |
| `text-elevated-foreground` | `var(--color-on-elevated)` |
| `primary`, `primary-hover`, `primary-foreground` | Same-named CSS vars |
| `shadow-card` | `var(--shadow-sm)` |
| `shadow-card-hover` | `var(--shadow-md)` |
| `shadow-elevated` | `var(--shadow-elevated)` |

Components that need a color not in Tailwind use arbitrary values, e.g. `text-[var(--color-on-surface-variant)]`, `border-[var(--color-outline)]`, `bg-[var(--color-surface-variant)]`.

---

## 5. Component usage guidelines

- **Backgrounds:** Prefer `bg-base`, `bg-surface`, `bg-elevated` (or `bg-surface-variant` where needed). Avoid hardcoded hex in components.
- **Text:** Use `text-[var(--color-on-surface)]`, `text-[var(--color-on-surface-variant)]`, or `text-[var(--color-on-base)]` as appropriate.
- **Borders:** Use `border-[var(--color-outline)]` or `border-[var(--color-divider)]`.
- **Buttons:** Use semantic classes: `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-edit`, `.btn-add` so colors stay consistent and theme-aware.
- **Focus:** Global focus uses `--color-primary` and `--color-primary-container` (ring). No custom focus colors in components.
- **Cards:** Use class `.card` (uses `--color-bg-surface`, `--color-outline`, `--color-on-surface`).

---

## 6. Document / print view (intentional exceptions)

The **A4 document view** (estimates, invoices) uses fixed “paper” colors so output is consistent for print/PDF:

- **Background:** `#ffffff`
- **Text:** `#3a3734`
- **Muted:** `#5c5956`
- **Borders:** `#b2aea8`
- **Table header:** `#e0ddda`

These are set in `.document-page` and related classes in `globals.css` with `!important` so theme switching does not change the document. EstimateDocumentView also uses `#ffffff` when cloning the DOM for print/PDF. This is intentional and not an inconsistency.

---

## 7. Consistency check summary

### 7.1 Consistent usage

- **Sidebars & spreadsheets:** Use `var(--color-outline)`, `var(--color-divider)`, `var(--color-surface-variant)`, `var(--color-on-surface-variant)`, `var(--color-primary)`, `var(--color-primary-container)`, `var(--color-card-text)` consistently.
- **Buttons:** All use `.btn-*` classes; no ad-hoc button colors.
- **Estimate status badges:** Use `.estimate-status-badge[data-status="…"]` with CSS variables.

### 7.2 Known exceptions (acceptable)

- **Auth (login/signup):** Google logo SVG uses brand colors (`#4285F4`, `#34A853`, etc.). Acceptable for third-party branding.
- **Document/print:** Fixed paper colors as above.

### 7.3 Minor hardening

- **AddItemsFromCatalogModal:** Uses hardcoded `shadow-[0_1px_3px_rgba(0,0,0,0.06)]`. Could use `shadow-card` or `var(--shadow-sm)` for theme consistency (dark mode would then get the darker shadow).

---

## 8. File reference

| File | Role |
|------|------|
| `src/app/globals.css` | All color variables, light/dark blocks, .btn/.card/.document-page, focus and input rules. |
| `tailwind.config.ts` | Maps `base`, `surface`, `elevated`, `primary`, shadows to CSS variables. |
| `src/app/layout.tsx` | Inline script sets `data-theme` from localStorage or system before paint. |
| `src/components/ThemeToggle.tsx` | Toggles `data-theme` between `light` and `dark`, persists to localStorage. |

---

## 9. Calculation table (estimate / invoice forms)

The discount & tax table (Total, Discount, Total after discount, Sales tax, G.Total) uses:

| Element | Background | Text | Border |
|--------|------------|------|--------|
| Wrapper | (inherits card) | — | `--color-outline` |
| Header row | `--color-surface-variant` | `--color-on-surface-variant` | `--color-outline` (bottom) |
| Body rows | (inherits card) | Label: `--color-on-surface-variant`, Amount: `--color-on-surface` | `--color-divider` (bottom) |
| Body row hover | `--color-surface-variant` at 20% | — | — |
| G.Total row | `--color-surface-variant` | Label: `--color-on-surface`, Amount: `--color-primary` | `--color-outline` (top, 2px) |
| Inputs/selects in table | `--color-input-bg` (via inputClass) | `--color-on-surface` | `--color-input-border` |

G.Total label uses on-surface; the amount uses primary so the total is clearly visible and theme-stable in light and dark.

---

## 10. Quick reference: “Where do I use what?”

| Need | Use |
|------|-----|
| Page background | `bg-base` or `var(--color-bg-base)` |
| Card / panel background | `bg-surface` or `.card` |
| Modal / dropdown background | `bg-elevated` + `shadow-elevated` |
| Primary text | `text-[var(--color-on-surface)]` or `text-[var(--color-on-base)]` |
| Secondary/muted text | `text-[var(--color-on-surface-variant)]` |
| Default border | `border-[var(--color-outline)]` |
| Soft divider | `border-[var(--color-divider)]` |
| Link / focus color | `var(--color-primary)` |
| Primary button | class `btn btn-primary` |
| Back / cancel | class `btn btn-secondary` |
| Delete | class `btn btn-danger` |
| Edit (pencil) | class `btn btn-edit` |
| Add (plus) | class `btn btn-add` |
| Input background | `var(--color-input-bg)` (or default from globals) |
| Error state | `var(--color-error)`, `var(--color-error-bg)` |
