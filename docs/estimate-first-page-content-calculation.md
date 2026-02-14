# First page content area calculation

## 1. Source: probe measurement

The **content area height** is measured once from a hidden probe (table-only page):

```
contentHeight (raw) = contentEl.clientHeight   // .document-page-content in probe
```

Probe layout: `.document-page-content` has `flex: 1 1 0`, so it fills the space between header and footer on a fixed 297mm page.

---

## 2. Adjusted content height (for notes/terms on last table page)

Used when splitting notes and terms on the **last table page** (which may be page 1):

```
contentHeight = mv.contentHeight - FOOTER_SAFETY + CONTENT_TOP_MARGIN_DIFF_PX
```

**Constants:**

| Constant | Value | Meaning |
|----------|--------|--------|
| `FOOTER_SAFETY` | 0 | No extra reserve at bottom |
| `CONTENT_TOP_MARGIN_DIFF_PX` | 8 | Probe has mt-5 (20px), real page has mt-3 (12px); add 8 so usable height matches |

So: **contentHeight = mv.contentHeight + 8**.

---

## 3. First page = “items” (Bill To + table)

**When page 1 is the only table page** (`pageChunks.length === 1`):

```
billToHeight      = billToBlockRef.current?.offsetHeight ?? BILL_TO_ESTIMATE   // actual height when first page rendered, else 180
billToReserve     = billToHeight when first page is also last table page, else 0
gapAfterBillTo    = GAP (8) when billToReserve > 0, else 0   // gap between Bill To and table (flex gap-2)
itemsHeight       = billToReserve + gapAfterBillTo + tableTotalHeight
tableTotalHeight  = headerHeight + (lastChunkRowCount + tfootRows) × rowHeight
tfootRows         = 2 + (showDiscount ? 2 : 0) + (totalTax != null ? 1 : 0)
```

**Bill To height:** The Bill To + Expiry block is measured in the DOM (`billToBlockRef` on the first page’s wrapper). That measured height is used for `billToReserve` so notes/terms get the correct remaining space. If the ref isn’t available yet (e.g. first run), we fall back to `BILL_TO_ESTIMATE` (180px). `rowsFirstPage` (row count on page 1) still uses the fixed 180 in the probe, since the probe doesn’t render the real Bill To.

**When page 1 is not the last table page:** `billToReserve = 0` (no Bill To on that page).

So on the **last table page** (first page or not):

```
itemsHeight = billToReserve + tableTotalHeight
```

That is the height reserved for “items” (Bill To + table) before notes/terms.

---

## 4. Row count on first page (table only)

From the **same probe** `contentHeight` (no +8 here):

```
GAP = 8
availableForRows     = contentHeight - headerHeight
rowsPerPage          = floor(availableForRows / rowHeight)

availableFirstPage   = contentHeight - headerHeight - GAP - BILL_TO_ESTIMATE
rowsFirstPage        = floor(availableFirstPage / rowHeight)
```

So on the first page we reserve **GAP (8) + BILL_TO_ESTIMATE (180)** before dividing by `rowHeight` to get `rowsFirstPage`.

---

## 5. Space for notes on last table page

```
spacingAfterItems = GAP   // 8
gapBeforeFooter   = 0

spaceForNotesOnLast = contentHeight - itemsHeight - spacingAfterItems - gapBeforeFooter
                    = contentHeight - itemsHeight - 8 - 0

maxNotesOnLast      = max(80, spaceForNotesOnLast - cardShellHeight)
```

Notes **card** height = `cardShellHeight + notesTextHeight`. We give notes **text** at most `spaceForNotesOnLast - cardShellHeight`.

---

## 6. Space for terms on last table page (when notes end there)

```
gapBeforeTerms = hasNotes ? GAP : 0   // 8 if notes present, else 0

spaceForTermsCard = contentHeight - itemsHeight - spacingAfterItems - notesCardHeight - gapBeforeTerms - gapBeforeFooter
                  = contentHeight - itemsHeight - 8 - notesCardHeight - gapBeforeTerms - 0

maxTermsOnLast     = max(80, spaceForTermsCard - cardShellHeight)
```

So:

- **No notes:**  
  `spaceForTermsCard = contentHeight - itemsHeight - 8`  
  (one gap after table, no gap before terms.)

- **With notes:**  
  `spaceForTermsCard = contentHeight - itemsHeight - 8 - notesCardHeight - 8`  
  (gap after table, notes card, gap before terms.)

---

## 7. Summary: first page content area

**Total content area (for notes/terms):**

```
contentHeight = mv.contentHeight + 8
```

**Used by items on last table page:**

```
itemsHeight = billToReserve + tableTotalHeight
```

**Remaining for notes (and then terms) on that page:**

```
remaining = contentHeight - itemsHeight - 8   // one gap after items; gapBeforeFooter = 0
```

Then notes get a **notes card** of height up to `remaining` (with `maxNotesOnLast = remaining - cardShellHeight` for the text).  
Terms get whatever is left after the notes card and one more 8px gap (when notes exist), with their own card shell subtracted for the terms **text** height.

No other extra space is subtracted for the first page content area beyond:

- one 8px gap after items (`spacingAfterItems`),
- optional 8px before terms when notes exist (`gapBeforeTerms`),
- the two card shells (notes and terms) when present.
